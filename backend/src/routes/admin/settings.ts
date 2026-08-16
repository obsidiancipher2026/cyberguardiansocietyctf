import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import { Competition, User } from "../../models";
import { config } from "../../config";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, conflict, notFound, unauthorized } from "../../utils/errors";
import { logAudit } from "../../services/adminAudit";
import { hub } from "../../services/realtime";
import { getCompetitionState } from "../../services/competition";

const router = Router();
router.use(requireAdmin);

router.get("/", asyncHandler(async (_req, res) => {
  const competition = await Competition.findOne({ order: [["id", "DESC"]] });
  res.json({
    settings: {
      competition: competition ?? null,
      platform: {
        nodeEnv: config.nodeEnv,
        appUrl: config.appUrl,
        maxUploadMb: config.upload.maxMb,
        rateLimitWindowMs: config.rateLimit.windowMs,
        rateLimitMax: config.rateLimit.max,
        adminSessionTtlDays: config.admin.sessionTtlDays,
        adminAccessTtl: config.admin.accessTtl,
        adminLoginMaxAttempts: config.admin.loginMaxAttempts,
        adminLockoutMinutes: Math.round(config.admin.lockoutMs / 60_000),
      },
    },
  });
}));

const patchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128),
  startTime: Joi.date().iso().allow(null),
  endTime: Joi.date().iso().allow(null),
  freezeOffsetMinutes: Joi.number().integer().min(0).max(24 * 60),
  status: Joi.string().valid("upcoming", "live", "frozen", "ended"),
});

router.patch("/", validate(patchSchema), asyncHandler(async (req, res) => {
  const competition = await Competition.findOne({ order: [["id", "DESC"]] });
  if (!competition) throw notFound();

  const updates: Record<string, unknown> = {};
  for (const key of ["name", "startTime", "endTime", "freezeOffsetMinutes", "status"] as const) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await competition.update(updates);
  await logAudit(req, { category: "settings", action: "settings.update", targetType: "competition", targetId: competition.id, details: { fields: Object.keys(updates) } });
  hub.broadcast("competition", { ...(await getCompetitionState()) });
  res.json({ message: "Settings updated" });
}));

const passwordSchema = Joi.object({
  currentPassword: Joi.string().max(128).required(),
  newPassword: Joi.string().min(12).max(128).required(),
});

router.post("/password", validate(passwordSchema), asyncHandler(async (req, res) => {
  const admin = req.admin!;
  if (!(await bcrypt.compare(req.body.currentPassword, admin.passwordHash))) {
    throw unauthorized("Current password is incorrect");
  }
  if (req.body.newPassword === req.body.currentPassword) {
    throw conflict("New password must differ from the current password");
  }
  const passwordHash = await bcrypt.hash(req.body.newPassword, config.bcryptRounds);
  await admin.update({ passwordHash });
  await logAudit(req, { category: "settings", action: "admin.password_changed", targetType: "admin", targetId: admin.id });
  res.json({ message: "Vault password updated" });
}));

const credentialsSchema = Joi.object({
  currentPassword: Joi.string().max(128).required(),
  username: Joi.string().pattern(/^[a-z0-9_]+$/).min(3).max(20),
  email: Joi.string().email().max(255),
  newPassword: Joi.string().min(12).max(128),
});

router.patch("/credentials", validate(credentialsSchema), asyncHandler(async (req, res) => {
  const admin = req.admin!;
  if (!(await bcrypt.compare(req.body.currentPassword, admin.passwordHash))) {
    throw unauthorized("Current password is incorrect");
  }

  const updates: Record<string, unknown> = {};
  if (req.body.username !== undefined && req.body.username !== admin.username) {
    const existing = await User.findOne({ where: { username: req.body.username } });
    if (existing) throw conflict("Username is already taken");
    updates.username = req.body.username;
  }
  if (req.body.email !== undefined && req.body.email.toLowerCase() !== admin.email.toLowerCase()) {
    const existing = await User.findOne({ where: { email: req.body.email } });
    if (existing) throw conflict("Email is already registered");
    updates.email = req.body.email;
  }
  if (req.body.newPassword !== undefined) {
    if (req.body.newPassword === req.body.currentPassword) {
      throw conflict("New password must differ from the current password");
    }
    updates.passwordHash = await bcrypt.hash(req.body.newPassword, config.bcryptRounds);
  }

  if (Object.keys(updates).length === 0) {
    res.json({ message: "No changes to apply", admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role } });
    return;
  }

  await admin.update(updates);
  await logAudit(req, {
    category: "settings",
    action: "admin.credentials_changed",
    targetType: "admin",
    targetId: admin.id,
    details: { fields: Object.keys(updates).map((f) => (f === "passwordHash" ? "password" : f)) },
  });
  res.json({
    message: "Administrator credentials updated",
    admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role },
  });
}));

export default router;
