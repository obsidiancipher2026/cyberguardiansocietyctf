import { Router } from "express";
import Joi from "joi";
import { Op, type WhereOptions } from "sequelize";
import { User, AdminSession, AdminLoginAttempt, AdminAuditLog, RefreshToken, SecurityAlert } from "../../models";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, notFound } from "../../utils/errors";
import { adminLockout } from "../../services/adminLockout";
import { logAudit } from "../../services/adminAudit";
import { submissionGuard } from "../../services/submissionGuard";
import { trafficMonitor } from "../../services/trafficMonitor";
import { scanPlagiarism } from "../../services/plagiarism";
import { adminEvents } from "../../services/adminEvents";
import { raiseAlert } from "../../services/securityAlerts";
import { likePattern } from "../../utils/search";

const router = Router();
router.use(requireAdmin);

function qp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

// ---------------------------------------------------------------------------
// Overview — one call to power the whole Security section header
// ---------------------------------------------------------------------------
router.get("/overview", asyncHandler(async (_req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [activeAdminSessions, activeUserSessions, failed24h, success24h, bannedUsers, audit24h, pendingAdminRole, openAlerts] =
    await Promise.all([
      AdminSession.count({ where: { revoked: false, expiresAt: { [Op.gt]: now } } }),
      RefreshToken.count({ where: { revoked: false, expiresAt: { [Op.gt]: now } } }),
      AdminLoginAttempt.count({ where: { success: false, createdAt: { [Op.gte]: dayAgo } } }),
      AdminLoginAttempt.count({ where: { success: true, createdAt: { [Op.gte]: dayAgo } } }),
      User.count({ where: { isBanned: true } }),
      AdminAuditLog.count({ where: { createdAt: { [Op.gte]: dayAgo } } }),
      User.count({ where: { role: "admin" } }),
      SecurityAlert.count({ where: { acknowledged: false } }),
    ]);

  const lockouts = adminLockout.snapshot();
  const rateBlocks = submissionGuard.blocksSnapshot();
  const traffic = trafficMonitor.snapshot();

  res.json({
    activeAdminSessions,
    activeUserSessions,
    failedLogins24h: failed24h,
    successfulLogins24h: success24h,
    bannedUsers,
    auditActions24h: audit24h,
    adminAccounts: pendingAdminRole,
    openAlerts,
    activeRateBlocks: rateBlocks.length,
    trafficRps: traffic.rps.current,
    trafficSpike: traffic.rps.current > traffic.rps.baseline * 3,
    activeLockouts: lockouts.identifier.length + lockouts.ip.length,
    lockouts,
  });
}));

// ---------------------------------------------------------------------------
// 1. Session management — admin vault sessions + user sessions
// ---------------------------------------------------------------------------
router.get("/sessions", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(qp(req.query.limit) ?? "50", 10) || 50));
  const kind = qp(req.query.kind); // "admin" | "user" | all

  const [adminRows, userRows] = await Promise.all([
    kind === "user"
      ? Promise.resolve([])
      : AdminSession.findAll({
          where: { revoked: false },
          include: [{ model: User, as: "admin", attributes: ["id", "username"] }],
          order: [["createdAt", "DESC"]],
          limit,
        }),
    kind === "admin"
      ? Promise.resolve([])
      : RefreshToken.findAll({
          where: { revoked: false, expiresAt: { [Op.gt]: new Date() } },
          include: [{ model: User, as: "user", attributes: ["id", "username"] }],
          order: [["createdAt", "DESC"]],
          limit,
        }),
  ]);

  const sessions = [
    ...adminRows.map((s) => ({
      id: s.id,
      type: "admin" as const,
      label: (s as unknown as { admin?: User }).admin?.username ?? "admin",
      entityId: s.adminId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    })),
    ...userRows.map((t) => ({
      id: t.id,
      type: "user" as const,
      label: (t as unknown as { user?: User }).user?.username ?? `#${t.userId}`,
      entityId: t.userId,
      ipAddress: t.ipAddress,
      userAgent: t.userAgent,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({
    total: sessions.length,
    page,
    limit,
    sessions: sessions.map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      entityId: s.entityId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}));

router.post("/sessions/:id/revoke", asyncHandler(async (req, res) => {
  const type = qp(req.query.type) === "user" ? "user" : "admin";
  if (type === "admin") {
    const session = await AdminSession.findByPk(req.params.id);
    if (!session) throw notFound();
    await session.update({ revoked: true });
    await logAudit(req, { category: "security", action: "session.revoke", targetType: "admin_session", targetId: session.id, details: { adminId: session.adminId } });
    res.json({ message: "Admin session revoked" });
  } else {
    const token = await RefreshToken.findByPk(req.params.id);
    if (!token) throw notFound();
    await token.update({ revoked: true });
    await logAudit(req, { category: "security", action: "session.revoke", targetType: "user_session", targetId: token.id, details: { userId: token.userId } });
    res.json({ message: "User session terminated" });
  }
}));

router.post("/sessions/revoke-all", asyncHandler(async (req, res) => {
  const kind = qp(req.query.kind) ?? "admin";
  if (kind === "user") {
    const [count] = await RefreshToken.update({ revoked: true }, { where: { revoked: false } });
    await logAudit(req, { category: "security", action: "sessions.revoke_all", details: { kind: "user", count } });
    res.json({ message: `All ${count} user sessions terminated` });
  } else {
    const [count] = await AdminSession.update({ revoked: true }, { where: { revoked: false } });
    await logAudit(req, { category: "security", action: "sessions.revoke_all", details: { kind: "admin", count } });
    res.json({ message: `All ${count} admin sessions revoked` });
  }
}));

// ---------------------------------------------------------------------------
// 2. Submission rate limiting
// ---------------------------------------------------------------------------
router.get("/rate-limit", asyncHandler(async (_req, res) => {
  res.json({
    limits: submissionGuard.limits(),
    blocks: submissionGuard.blocksSnapshot(),
  });
}));

const rateLimitPatchSchema = Joi.object({
  windowMs: Joi.number().integer().min(1000).max(600000),
  maxPerUser: Joi.number().integer().min(1).max(200),
  maxPerIp: Joi.number().integer().min(1).max(1000),
});

router.patch("/rate-limit", validate(rateLimitPatchSchema), asyncHandler(async (req, res) => {
  const before = submissionGuard.limits();
  submissionGuard.updateLimits({
    windowMs: req.body.windowMs,
    maxPerUser: req.body.maxPerUser,
    maxPerIp: req.body.maxPerIp,
  });
  await logAudit(req, { category: "security", action: "rate_limit.update", targetType: "config", details: { before, after: submissionGuard.limits() } });
  await raiseAlert({
    severity: "info",
    category: "rate_limit",
    title: "Submission rate limit updated",
    message: "Flag submission throttling limits were changed by an operator.",
    details: { before, after: submissionGuard.limits() },
  });
  res.json({ message: "Rate limit updated", limits: submissionGuard.limits() });
}));

router.post("/rate-limit/clear", asyncHandler(async (req, res) => {
  const key = typeof req.body?.key === "string" && req.body.key ? req.body.key : null;
  let cleared: number;
  if (key) {
    submissionGuard.clearBlock(key);
    cleared = 1;
  } else {
    cleared = submissionGuard.clearAll();
  }
  await logAudit(req, { category: "security", action: "rate_limit.clear", targetType: "config", details: { key: key ?? "all", cleared } });
  res.json({ message: `Cleared ${cleared} rate-limit block(s)` });
}));

// ---------------------------------------------------------------------------
// 3. Plagiarism detection
// ---------------------------------------------------------------------------
const plagiarismSchema = Joi.object({
  sinceHours: Joi.number().integer().min(1).max(24 * 30),
  minTeams: Joi.number().integer().min(2).max(20),
});

router.get("/plagiarism", validate(plagiarismSchema), asyncHandler(async (req, res) => {
  const cases = await scanPlagiarism({
    sinceHours: parseInt(qp(req.query.sinceHours) ?? "48", 10) || 48,
    minTeams: parseInt(qp(req.query.minTeams) ?? "2", 10) || 2,
  });
  res.json({ total: cases.length, cases });
}));

// ---------------------------------------------------------------------------
// 4. Audit trails
// ---------------------------------------------------------------------------
const auditSchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  category: Joi.string().trim().max(32),
  search: Joi.string().trim().max(120),
});

router.get("/audit", validate(auditSchema), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(qp(req.query.limit) ?? "50", 10) || 50));
  const category = qp(req.query.category);
  const search = qp(req.query.search);

  const where: WhereOptions = {};
  if (category) where.category = category;
  if (search) where.action = { [Op.like]: likePattern(search) };

  const { rows, count } = await AdminAuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: "admin", attributes: ["id", "username"] }],
    order: [["createdAt", "DESC"]],
    offset: (page - 1) * limit,
    limit,
  });

  res.json({
    total: count,
    page,
    limit,
    entries: rows.map((a) => ({
      id: a.id,
      adminId: a.adminId,
      adminUsername: (a as unknown as { admin?: User }).admin?.username ?? "system",
      category: a.category,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}));

// ---------------------------------------------------------------------------
// 5. Traffic analysis
// ---------------------------------------------------------------------------
router.get("/traffic", asyncHandler(async (_req, res) => {
  res.json(trafficMonitor.snapshot());
}));

// ---------------------------------------------------------------------------
// 6. Real-time alerts
// ---------------------------------------------------------------------------
const alertsSchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  acknowledged: Joi.string().valid("true", "false"),
  severity: Joi.string().valid("info", "warning", "critical"),
});

router.get("/alerts", validate(alertsSchema), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(qp(req.query.limit) ?? "50", 10) || 50));
  const acknowledged = qp(req.query.acknowledged);
  const severity = qp(req.query.severity);

  const where: WhereOptions = {};
  if (acknowledged) where.acknowledged = acknowledged === "true";
  if (severity) where.severity = severity;

  const { rows, count } = await SecurityAlert.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    offset: (page - 1) * limit,
    limit,
  });

  res.json({
    total: count,
    page,
    limit,
    alerts: rows.map((a) => ({
      id: a.id,
      severity: a.severity,
      category: a.category,
      title: a.title,
      message: a.message,
      details: a.details,
      acknowledged: a.acknowledged,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}));

router.post("/alerts/:id/acknowledge", asyncHandler(async (req, res) => {
  const alert = await SecurityAlert.findByPk(req.params.id);
  if (!alert) throw notFound();
  await alert.update({ acknowledged: true, acknowledgedBy: req.admin!.id });
  await logAudit(req, { category: "security", action: "alert.acknowledge", targetType: "security_alert", targetId: alert.id, details: { title: alert.title } });
  res.json({ message: "Alert acknowledged" });
}));

router.post("/alerts/clear-acknowledged", asyncHandler(async (req, res) => {
  const count = await SecurityAlert.destroy({ where: { acknowledged: true } });
  await logAudit(req, { category: "security", action: "alerts.clear", details: { count } });
  res.json({ message: `Removed ${count} acknowledged alert(s)` });
}));

// ---------------------------------------------------------------------------
// 7. Live security event stream (SSE) — admin-only push of alerts
// ---------------------------------------------------------------------------
router.get("/stream", asyncHandler(async (req, res) => {
  if (!adminEvents.connect(res)) {
    res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Event stream connection limit reached." } });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`event: hello\ndata: {"connected":true}\n\n`);
  const ping = setInterval(() => res.write(`: ping\n\n`), 25_000);
  req.on("close", () => clearInterval(ping));
}));

// ---------------------------------------------------------------------------
// Login attempt forensics + lockout administration (kept from v1)
// ---------------------------------------------------------------------------
const attemptsSchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  success: Joi.string().valid("true", "false"),
});

router.get("/attempts", validate(attemptsSchema), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(qp(req.query.limit) ?? "50", 10) || 50));
  const success = qp(req.query.success);

  const where: WhereOptions = {};
  if (success) where.success = success === "true";

  const { rows, count } = await AdminLoginAttempt.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    offset: (page - 1) * limit,
    limit,
  });

  res.json({
    total: count,
    page,
    limit,
    attempts: rows.map((a) => ({
      id: a.id,
      identifier: a.identifier,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      success: a.success,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}));

router.get("/lockouts", asyncHandler(async (_req, res) => {
  res.json({ lockouts: adminLockout.snapshot() });
}));

router.post(
  "/lockouts/clear",
  validate(Joi.object({ key: Joi.string().trim().max(255).allow("").optional() })),
  asyncHandler(async (req, res) => {
    const key = (req.body.key as string) ?? "";
    if (key) {
      adminLockout.clear(key, key);
    } else {
      for (const rec of adminLockout.snapshot().identifier) adminLockout.clear(rec.key, rec.key);
      for (const rec of adminLockout.snapshot().ip) adminLockout.clear(rec.key, rec.key);
    }
    await logAudit(req, { category: "security", action: "lockouts.cleared", details: { key: key || "all" } });
    res.json({ message: key ? `Lockout cleared for ${key}` : "All lockouts cleared" });
  })
);

export default router;
