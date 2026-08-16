import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { User, Team, RefreshToken } from "../models";
import { config } from "../config";
import { validate, passwordSchema } from "../middleware/validate";
import { strictLimiter } from "../middleware/rateLimiter";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, conflict, forbidden, unauthorized } from "../utils/errors";
import { sha256, generateToken } from "../utils/crypto";
import { signUserAccessToken } from "../utils/tokens";
import { logger } from "../utils/logger";
import { bruteForceMonitor } from "../services/bruteForce";
import { logActivity } from "../services/activityLog";
import { adminEvents } from "../services/adminEvents";
import { raiseAlert } from "../services/securityAlerts";

const router = Router();

const REFRESH_COOKIE = "cgs_refresh";

// Precomputed bcrypt hash of a fake password so an unknown-identifier login
// takes the same time as a real bcrypt.compare — kills the timing oracle.
const DUMMY_HASH = bcrypt.hashSync("cgs-dummy-password-for-timing-equalization", config.bcryptRounds);

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  };
}

async function issueRefreshToken(userId: number, req: import("express").Request): Promise<string> {
  const token = generateToken(48);
  await RefreshToken.create({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000),
    ipAddress: (req.ip || req.socket?.remoteAddress || null)?.slice(0, 64) ?? null,
    userAgent: (req.get("user-agent") || null)?.slice(0, 512) ?? null,
  });

  // Cap active sessions per account (newest N kept) so stolen-token replay
  // cannot pile up DB rows and a single leaked token cannot grant unlimited
  // concurrent sessions.
  const MAX_ACTIVE = 5;
  const active = await RefreshToken.findAll({
    where: { userId, revoked: false },
    order: [["createdAt", "DESC"]],
    attributes: ["id"],
  });
  if (active.length > MAX_ACTIVE) {
    const excess = active.slice(MAX_ACTIVE).map((r) => r.id);
    await RefreshToken.update({ revoked: true }, { where: { id: { [Op.in]: excess } } });
  }
  return token;
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    // Handles both bare origins (Origin header) and full URLs (Referer header).
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function csrfOriginOk(req: import("express").Request): boolean {
  const raw = req.get("origin") || req.get("referer") || "";
  const origin = normalizeOrigin(raw);
  // Non-browser / same-origin requests (no Origin/Referer) are allowed; they
  // cannot carry ambient credentials for a cross-site attack.
  if (origin === null) return true;
  return config.frontendOrigins.some((o) => normalizeOrigin(o) === origin);
}

router.post(
  "/register",
  strictLimiter(5, 15 * 60_000),
  validate(
    Joi.object({
      fullName: Joi.string().min(2).max(100).pattern(/^[A-Za-z\u00C0-\u024F]+(?: [A-Za-z\u00C0-\u024F]+)*$/).required().messages({
        "string.pattern.base": "Full name can only contain letters and spaces",
      }),
      email: Joi.string().email().max(255).required(),
      username: Joi.string().pattern(/^[a-z0-9]+$/).min(3).max(20).required().messages({
        "string.pattern.base": "Username can only contain lowercase letters and numbers",
      }),
      password: passwordSchema.required(),
      confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
        "any.only": "Passwords do not match",
      }),
      university: Joi.string().trim().min(2).max(100).required(),
      country: Joi.string().trim().min(2).max(80).required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { fullName, username, email, password, university, country } = req.body;

    const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existing) {
      throw conflict("An account with that username or email already exists");
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    const user = await User.create({
      username,
      email,
      fullName,
      university,
      country,
      passwordHash,
      teamId: null,
      role: "user",
      isVerified: true,
      isApproved: false,
      mustChangePassword: false,
    });

    logger.info("User registered", { userId: user.id, username: user.username });
    await logActivity(req, {
      category: "auth",
      action: "register",
      message: `New registration submitted: ${user.username}`,
      userId: user.id,
      targetType: "user",
      targetId: user.id,
      details: { username: user.username },
    });
    adminEvents.broadcast("users.refresh", { type: "registered", userId: user.id });
    res.status(201).json({
      message: "Registration submitted. An administrator must approve your account before you can sign in.",
    });
  })
);


router.post(
  "/login",
  strictLimiter(10, 15 * 60_000),
  validate(
    Joi.object({
      identifier: Joi.string().max(255).required(),
      password: Joi.string().max(128).required(),
      rememberMe: Joi.boolean().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const ip = (req.ip || req.socket?.remoteAddress || "unknown").slice(0, 64);

    const user = await User.findOne({
      where: { [Op.or]: [{ username: identifier }, { email: identifier }] },
    });

    const genericFail = () => {
      bruteForceMonitor.recordFailure(identifier, ip);
      logger.warn("Failed login attempt", { identifier, ip });
      void logActivity(req, {
        category: "auth",
        action: "login.failed",
        message: `Failed login attempt for ${identifier}`,
        details: { identifier },
      });
      throw unauthorized("Invalid credentials");
    };

    if (!user) {
      // Equalise response timing for unknown identifiers (dummy compare)
      await bcrypt.compare(password, DUMMY_HASH);
      genericFail();
    }

    const ok = await bcrypt.compare(password, user!.passwordHash);
    if (!ok) genericFail();

    if (user!.isBanned) {
      if (user!.banExpiresAt && user!.banExpiresAt.getTime() < Date.now()) {
        await user!.update({ isBanned: false, banReason: null, banExpiresAt: null });
      } else {
        throw forbidden("Account is suspended");
      }
    }

    if (!user!.isApproved) {
      await logActivity(req, {
        category: "auth",
        action: "login.denied",
        message: `Login denied for ${user!.username}: account pending approval`,
        userId: user!.id,
        details: { reason: "pending_approval" },
      });
      throw forbidden(
        "Your account is pending administrator approval. Please wait for an administrator to approve your registration before signing in."
      );
    }

    if (!user!.isVerified) {
      await logActivity(req, {
        category: "auth",
        action: "login.denied",
        message: `Login denied for ${user!.username}: email not verified`,
        userId: user!.id,
        details: { reason: "unverified" },
      });
      throw forbidden("Email not verified. Check your inbox for the verification link.");
    }

    bruteForceMonitor.clear(identifier, ip);
    await user!.update({ lastLoginAt: new Date() });
    await logActivity(req, {
      category: "auth",
      action: "login.success",
      message: `${user!.username} signed in`,
      userId: user!.id,
      targetType: "user",
      targetId: user!.id,
    });

    const refreshToken = await issueRefreshToken(user!.id, req);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    res.json({
      accessToken: signUserAccessToken(user!.id, user!.role),
      user: user!.toPublic(),
    });
  })
);

router.post(
  "/refresh",
  strictLimiter(30, 15 * 60_000),
  asyncHandler(async (req, res) => {
    if (!csrfOriginOk(req)) throw unauthorized("Cross-origin request rejected");

    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized("No refresh token");

    const record = await RefreshToken.findOne({
      where: { tokenHash: sha256(token), revoked: false },
    });
    if (!record) {
      // Reuse detection: a revoked/unknown token with a matching hash means a
      // previously-valid token was replayed. Revoke the whole session family
      // and alert so a stolen-token replay cannot keep rotating silently.
      const anyRecord = await RefreshToken.findOne({ where: { tokenHash: sha256(token) } });
      if (anyRecord && anyRecord.revoked) {
        await RefreshToken.update({ revoked: true }, { where: { userId: anyRecord.userId } });
        await raiseAlert({
          severity: "warning",
          category: "session",
          title: "Refresh token reuse detected",
          message: `A previously rotated refresh token was replayed for user #${anyRecord.userId}. All of the user's sessions were revoked.`,
          details: { userId: anyRecord.userId, ip: (req.ip || null)?.slice(0, 64) ?? null },
        });
        logger.warn("Refresh token reuse detected", { userId: anyRecord.userId, ip: req.ip });
      }
      throw unauthorized("Invalid refresh token");
    }
    if (record.expiresAt.getTime() < Date.now()) throw unauthorized("Refresh token expired");

    const user = await User.findByPk(record.userId);
    if (!user || user.isBanned) throw unauthorized("Account unavailable");
    if (!user.isApproved) throw unauthorized("Account pending administrator approval");

    await record.update({ revoked: true });
    const nextToken = await issueRefreshToken(user.id, req);
    res.cookie(REFRESH_COOKIE, nextToken, refreshCookieOptions());
    res.json({
      accessToken: signUserAccessToken(user.id, user.role),
      user: user.toPublic(),
    });
  })
);

router.post("/logout", asyncHandler(async (req, res) => {
  if (!csrfOriginOk(req)) throw unauthorized("Cross-origin request rejected");
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await RefreshToken.update(
      { revoked: true },
      { where: { tokenHash: sha256(token) } }
    );
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  await logActivity(req, {
    category: "auth",
    action: "logout",
    message: "User signed out",
    userId: req.user?.id ?? null,
  });
  res.json({ message: "Logged out" });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user!.toPublic() });
}));

export default router;
