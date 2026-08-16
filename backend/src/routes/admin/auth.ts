import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { User, AdminSession, AdminLoginAttempt } from "../../models";
import { config } from "../../config";
import { validate } from "../../middleware/validate";
import { strictLimiter } from "../../middleware/rateLimiter";
import { requireAdmin } from "../../middleware/adminAuth";
import { HttpError, asyncHandler, forbidden, unauthorized } from "../../utils/errors";
import { sha256, generateToken } from "../../utils/crypto";
import { signAdminAccessToken } from "../../utils/tokens";
import { logger } from "../../utils/logger";
import { adminLockout } from "../../services/adminLockout";
import { logAudit } from "../../services/adminAudit";
import { bruteForceMonitor } from "../../services/bruteForce";
import { raiseAlert } from "../../services/securityAlerts";

const router = Router();

const REFRESH_COOKIE = "cgs_admin_refresh";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: (config.isProd ? "none" : "lax") as "none" | "lax",
    path: "/api/admin",
    maxAge: config.admin.sessionTtlDays * 24 * 60 * 60 * 1000,
  };
}

async function issueAdminSession(adminId: number, req: import("express").Request): Promise<{ sessionId: number; token: string }> {
  const token = generateToken(48);
  const session = await AdminSession.create({
    adminId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + config.admin.sessionTtlDays * 24 * 60 * 60 * 1000),
    ipAddress: (req.ip || req.socket?.remoteAddress || null)?.slice(0, 64) ?? null,
    userAgent: (req.get("user-agent") || null)?.slice(0, 512) ?? null,
  });

  const MAX_ACTIVE = 5;
  const active = await AdminSession.findAll({
    where: { adminId, revoked: false },
    order: [["createdAt", "DESC"]],
    attributes: ["id"],
  });
  if (active.length > MAX_ACTIVE) {
    const excess = active.slice(MAX_ACTIVE).map((r) => r.id);
    await AdminSession.update({ revoked: true }, { where: { id: { [Op.in]: excess } } });
  }
  return { sessionId: session.id, token };
}

async function recordAttempt(req: import("express").Request, input: { identifier?: string; success: boolean; reason?: string }): Promise<void> {
  try {
    await AdminLoginAttempt.create({
      identifier: input.identifier?.slice(0, 255) ?? null,
      ipAddress: (req.ip || req.socket?.remoteAddress || null)?.slice(0, 64) ?? null,
      userAgent: (req.get("user-agent") || null)?.slice(0, 512) ?? null,
      success: input.success,
      reason: input.reason ?? null,
    });
  } catch {
    // never break the auth flow on a logging failure
  }
}

function clientIp(req: import("express").Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function csrfOriginOk(req: import("express").Request): boolean {
  const origin = req.get("origin") || req.get("referer") || "";
  const normalized = normalizeOrigin(origin);
  // Non-browser / same-origin requests (no Origin/Referer) are allowed; they
  // cannot carry ambient credentials for a cross-site attack.
  if (normalized === null) return true;
  // Exact normalized-origin comparison — never prefix matching, which would
  // let https://app.example.com.evil.com pass for https://app.example.com.
  return config.frontendOrigins.some((o) => normalizeOrigin(o) === normalized);
}

function adminPayload(admin: User) {
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt,
  };
}

// ---------- Auth routes ----------

router.post(
  "/login",
  strictLimiter(6, 15 * 60_000),
  validate(
    Joi.object({
      identifier: Joi.string().max(255).required(),
      password: Joi.string().max(128).required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const ip = clientIp(req);

    const lock = adminLockout.isLocked(identifier, ip);
    if (lock.locked) {
      const mins = Math.ceil((lock.until - Date.now()) / 60_000);
      await recordAttempt(req, { identifier, success: false, reason: "locked_out" });
      bruteForceMonitor.recordFailure(identifier, ip);
      await logAudit(req, { category: "auth", action: "login.failed", targetType: "admin_vault", targetId: identifier, details: { reason: "locked_out", minutes: mins } });
      throw new HttpError(
        429,
        "RATE_LIMITED",
        `Too many failed attempts. Vault locked for ${mins} minute${mins === 1 ? "" : "s"}.`
      );
    }

    const admin = await User.findOne({
      where: {
        role: "admin",
        [Op.or]: [{ username: identifier }, { email: identifier.toLowerCase() }],
      },
    });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      adminLockout.recordFailure(identifier, ip);
      bruteForceMonitor.recordFailure(identifier, ip);
      await logAudit(req, { category: "auth", action: "login.failed", targetType: "admin_vault", targetId: identifier, details: { reason: "bad_credentials" } });
      await recordAttempt(req, { identifier, success: false, reason: "bad_credentials" });
      logger.warn("Failed admin vault login", { identifier, ip });
      throw unauthorized("Invalid vault credentials");
    }

    if (admin.isBanned) {
      await recordAttempt(req, { identifier, success: false, reason: "suspended" });
      await logAudit(req, { category: "auth", action: "login.suspended", targetType: "admin_vault", targetId: identifier, details: { reason: "suspended" } });
      throw forbidden("Administrator account is suspended");
    }

    await admin.update({ lastLoginAt: new Date() });
    adminLockout.clear(identifier, ip);
    bruteForceMonitor.clear(identifier, ip);
    await logAudit(req, { category: "auth", action: "login.success", targetType: "admin_vault", targetId: admin.id, details: { username: admin.username } });
    await recordAttempt(req, { identifier, success: true });

    const issued = await issueAdminSession(admin.id, req);
    res.cookie(REFRESH_COOKIE, issued.token, refreshCookieOptions());
    logger.info("Admin vault login", { adminId: admin.id, ip });
    res.json({
      accessToken: signAdminAccessToken(admin.id, issued.sessionId),
      admin: adminPayload(admin),
    });
  })
);

router.post(
  "/refresh",
  strictLimiter(30, 15 * 60_000),
  asyncHandler(async (req, res) => {
    if (!csrfOriginOk(req)) throw unauthorized("Cross-origin request rejected");
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized("No admin session");

    const record = await AdminSession.findOne({ where: { tokenHash: sha256(token), revoked: false } });
    if (!record) {
      // Reuse detection: a replayed (already-rotated) session token revokes
      // the whole admin session family and raises an alert.
      const anyRecord = await AdminSession.findOne({ where: { tokenHash: sha256(token) } });
      if (anyRecord && anyRecord.revoked) {
        await AdminSession.update({ revoked: true }, { where: { adminId: anyRecord.adminId } });
        await raiseAlert({
          severity: "critical",
          category: "session",
          title: "Admin session token reuse detected",
          message: `A previously rotated admin session token was replayed for admin #${anyRecord.adminId}. All admin sessions were revoked.`,
          details: { adminId: anyRecord.adminId, ip: (req.ip || null)?.slice(0, 64) ?? null },
        });
        logger.warn("Admin session token reuse detected", { adminId: anyRecord.adminId, ip: req.ip });
      }
      throw unauthorized("Invalid admin session");
    }
    if (record.expiresAt.getTime() < Date.now()) throw unauthorized("Admin session expired");

    const admin = await User.findByPk(record.adminId);
    if (!admin || admin.role !== "admin") throw unauthorized("Administrator unavailable");
    if (admin.isBanned) throw forbidden("Administrator account is suspended");

    await record.update({ revoked: true });
    const nextSession = await issueAdminSession(admin.id, req);
    res.cookie(REFRESH_COOKIE, nextSession.token, refreshCookieOptions());
    res.json({
      accessToken: signAdminAccessToken(admin.id, nextSession.sessionId),
      admin: adminPayload(admin),
    });
  })
);

router.post("/logout", asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await AdminSession.update({ revoked: true }, { where: { tokenHash: sha256(token) } });
    await logAudit(req, { category: "auth", action: "logout", targetType: "admin_session", targetId: null, details: { wasActive: true } });
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/admin" });
  res.json({ message: "Admin session terminated" });
}));

router.get("/me", requireAdmin, asyncHandler(async (req, res) => {
  const admin = req.admin!;
  res.json({
    admin: {
      ...adminPayload(admin),
      createdAt: admin.createdAt,
    },
  });
}));

export default router;