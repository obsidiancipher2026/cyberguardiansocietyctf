import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import { Op, type WhereOptions } from "sequelize";
import { User, Team, Submission, HintPurchase, RefreshToken, AdminSession } from "../../models";
import { config } from "../../config";
import { validate, passwordSchema } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, conflict, forbidden, notFound } from "../../utils/errors";
import { logAudit } from "../../services/adminAudit";
import { adminEvents } from "../../services/adminEvents";
import { likePattern } from "../../utils/search";

const router = Router();
router.use(requireAdmin);

const userListSchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(1000),
  search: Joi.string().trim().max(100).allow(""),
  role: Joi.string().valid("user", "admin"),
  verified: Joi.string().valid("true", "false"),
  approved: Joi.string().valid("true", "false"),
  banned: Joi.string().valid("true", "false"),
});

function qp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

router.get(
  "/",
  validate(userListSchema),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(qp(req.query.limit) ?? "20", 10) || 20));
    const search = qp(req.query.search);
    const role = qp(req.query.role);
    const verified = qp(req.query.verified);
    const approved = qp(req.query.approved);
    const banned = qp(req.query.banned);

    const where: WhereOptions = {};
    if (search) {
      Object.assign(where, {
        [Op.or]: [
          { username: { [Op.like]: likePattern(search) } },
          { email: { [Op.like]: likePattern(search) } },
          { fullName: { [Op.like]: likePattern(search) } },
          { university: { [Op.like]: likePattern(search) } },
        ],
      });
    }
    if (role) where.role = role;
    if (verified) where.isVerified = verified === "true";
    if (approved) where.isApproved = approved === "true";
    if (banned) where.isBanned = banned === "true";

    const { rows, count } = await User.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });

    const ids = rows.map((u) => u.id);
    const [submissionCounts, correctCounts, points, teams] = await Promise.all([
      Submission.count({ where: { userId: { [Op.in]: ids } }, group: ["userId"] }),
      Submission.count({ where: { userId: { [Op.in]: ids }, isCorrect: true }, group: ["userId"] }),
      Submission.findAll({
        attributes: ["userId", "pointsAwarded"],
        where: { userId: { [Op.in]: ids }, isCorrect: true },
        raw: true,
      }),
      Team.findAll({ attributes: ["id", "name"] }),
    ]);
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));
    const subCountMap = new Map(
      (submissionCounts as unknown as { userId: number; count: number }[]).map((r) => [r.userId, r.count])
    );
    const correctMap = new Map(
      (correctCounts as unknown as { userId: number; count: number }[]).map((r) => [r.userId, r.count])
    );
    const pointsMap = new Map<number, number>();
    for (const p of points) pointsMap.set(p.userId, (pointsMap.get(p.userId) ?? 0) + p.pointsAwarded);

    res.json({
      total: count,
      page,
      limit,
      users: rows.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        university: u.university,
        country: u.country,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
        isBanned: u.isBanned,
        banReason: u.banReason,
        banExpiresAt: u.banExpiresAt,
        twoFAEnabled: u.twoFAEnabled,
        team: u.teamId ? (teamMap.get(u.teamId) ?? null) : null,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt.toISOString(),
        stats: {
          attempts: subCountMap.get(u.id) ?? 0,
          solves: correctMap.get(u.id) ?? 0,
          points: pointsMap.get(u.id) ?? 0,
        },
      })),
    });
  })
);

const createUserSchema = Joi.object({
  username: Joi.string().pattern(/^[a-z0-9]+$/).min(3).max(20).required(),
  email: Joi.string().email().max(255).required(),
  fullName: Joi.string().trim().max(100).optional().allow(""),
  password: passwordSchema.required(),
  university: Joi.string().trim().max(100).optional().allow(""),
  country: Joi.string().trim().max(80).optional().allow(""),
  role: Joi.string().valid("user", "admin").default("user"),
  isVerified: Joi.boolean().default(true),
  isApproved: Joi.boolean().default(true),
});

router.post(
  "/",
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { username, email, password, fullName, university, country, role, isVerified, isApproved } = req.body;
    const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existing) throw conflict("Username or email already in use");

    const user = await User.create({
      username,
      email,
      fullName: fullName || null,
      university: university || null,
      country: country || null,
      passwordHash: await bcrypt.hash(password, config.bcryptRounds),
      role,
      isVerified,
      isApproved,
      mustChangePassword: false,
    });
    await logAudit(req, { category: "users", action: "user.create", targetType: "user", targetId: user.id, details: { username } });
    adminEvents.broadcast("users.refresh", { action: "created", userId: user.id });
    res.status(201).json({ message: "User created", user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  })
);

router.post(
  "/approve-all",
  asyncHandler(async (req, res) => {
    const [count] = await User.update({ isApproved: true }, { where: { isApproved: false } });
    await logAudit(req, { category: "users", action: "user.approve_all", targetType: "bulk", details: { count } });
    adminEvents.broadcast("users.refresh", { action: "approve_all", count });
    res.json({ message: `Approved ${count} pending account(s)`, count });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();
    res.json({
      user: {
        ...user.toPublic(),
        fullName: user.fullName,
        university: user.university,
        country: user.country,
        banReason: user.banReason,
        banExpiresAt: user.banExpiresAt,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt,
      },
    });
  })
);

const patchUserSchema = Joi.object({
  fullName: Joi.string().trim().max(100).optional().allow(""),
  university: Joi.string().trim().max(100).optional().allow(""),
  country: Joi.string().trim().max(80).optional().allow(""),
  email: Joi.string().email().max(255).optional(),
  username: Joi.string().pattern(/^[a-z0-9]+$/).min(3).max(20).optional(),
  password: passwordSchema.optional(),
  isVerified: Joi.boolean().optional(),
});

router.patch(
  "/:id",
  validate(patchUserSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();

    const updates: Record<string, unknown> = {};
    if (req.body.fullName !== undefined) updates.fullName = req.body.fullName || null;
    if (req.body.university !== undefined) updates.university = req.body.university || null;
    if (req.body.country !== undefined) updates.country = req.body.country || null;
    if (req.body.email !== undefined) {
      const clash = await User.findOne({ where: { email: req.body.email, id: { [Op.ne]: user.id } } });
      if (clash) throw conflict("Email already in use");
      updates.email = req.body.email;
    }
    if (req.body.username !== undefined) {
      const clash = await User.findOne({ where: { username: req.body.username, id: { [Op.ne]: user.id } } });
      if (clash) throw conflict("Username already in use");
      updates.username = req.body.username;
    }
    if (req.body.password !== undefined) {
      updates.passwordHash = await bcrypt.hash(req.body.password, config.bcryptRounds);
    }
    if (req.body.isVerified !== undefined) updates.isVerified = req.body.isVerified;

    await user.update(updates);
    await logAudit(req, { category: "users", action: "user.update", targetType: "user", targetId: user.id, details: { fields: Object.keys(updates) } });
    adminEvents.broadcast("users.refresh", { action: "updated", userId: user.id });
    res.json({ message: "User updated" });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();
    if (req.admin!.id === user.id) throw forbidden("You cannot delete your own administrator account");

    // Remove dependent rows explicitly (submissions, purchases, sessions)
    await Submission.destroy({ where: { userId: user.id } });
    await HintPurchase.destroy({ where: { userId: user.id } });
    await RefreshToken.destroy({ where: { userId: user.id } });
    await AdminSession.destroy({ where: { adminId: user.id } });
    await Team.destroy({ where: { ownerId: user.id } });
    await User.destroy({ where: { id: user.id } });

    await logAudit(req, { category: "users", action: "user.delete", targetType: "user", targetId: user.id, details: { username: user.username } });
    adminEvents.broadcast("users.refresh", { action: "deleted", userId: user.id });
    res.json({ message: "User deleted" });
  })
);

const banSchema = Joi.object({
  reason: Joi.string().trim().max(255).required(),
  expiresAt: Joi.date().iso().optional().allow(null),
});

router.post(
  "/:id/ban",
  validate(banSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();
    if (req.admin!.id === user.id) throw forbidden("You cannot ban your own administrator account");

    await user.update({ isBanned: true, banReason: req.body.reason, banExpiresAt: req.body.expiresAt ?? null });
    await logAudit(req, { category: "users", action: "user.ban", targetType: "user", targetId: user.id, details: { reason: req.body.reason } });
    adminEvents.broadcast("users.refresh", { action: "banned", userId: user.id });
    res.json({ message: "User banned" });
  })
);

router.post(
  "/:id/unban",
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();
    await user.update({ isBanned: false, banReason: null, banExpiresAt: null });
    await logAudit(req, { category: "users", action: "user.unban", targetType: "user", targetId: user.id });
    adminEvents.broadcast("users.refresh", { action: "unbanned", userId: user.id });
    res.json({ message: "User unbanned" });
  })
);

router.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();

    await user.update({ isApproved: true });
    await logAudit(req, { category: "users", action: "user.approve", targetType: "user", targetId: user.id, details: { username: user.username } });
    adminEvents.broadcast("users.refresh", { action: "approved", userId: user.id });
    res.json({ message: "User approved; they can now sign in" });
  })
);

router.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();

    await Submission.destroy({ where: { userId: user.id } });
    await HintPurchase.destroy({ where: { userId: user.id } });
    await RefreshToken.destroy({ where: { userId: user.id } });
    await Team.destroy({ where: { ownerId: user.id } });
    await User.destroy({ where: { id: user.id } });

    await logAudit(req, { category: "users", action: "user.reject", targetType: "user", targetId: user.id, details: { username: user.username } });
    res.json({ message: "Registration rejected and account removed" });
  })
);

router.post(
  "/:id/verify",
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();
    await user.update({ isVerified: true });
    await logAudit(req, { category: "users", action: "user.verify", targetType: "user", targetId: user.id });
    res.json({ message: "User verified" });
  })
);

const roleSchema = Joi.object({
  role: Joi.string().valid("user", "admin").required(),
});

router.patch(
  "/:id/role",
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();

    const targetRole: "user" | "admin" = req.body.role;
    if (req.admin!.id === user.id && targetRole !== "admin") {
      throw forbidden("You cannot demote your own administrator account");
    }
    if (targetRole !== "admin" && user.role === "admin") {
      const adminCount = await User.count({ where: { role: "admin" } });
      if (adminCount <= 1) throw conflict("At least one administrator must remain");
    }

    await user.update({ role: targetRole });
    await logAudit(req, { category: "users", action: "user.role", targetType: "user", targetId: user.id, details: { role: targetRole } });
    res.json({ message: `Role set to ${targetRole}` });
  })
);

const resetPasswordSchema = Joi.object({
  password: passwordSchema.required(),
});

router.post(
  "/:id/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound();
    const passwordHash = await bcrypt.hash(req.body.password, config.bcryptRounds);
    await user.update({ passwordHash, mustChangePassword: true });
    await logAudit(req, { category: "users", action: "user.reset_password", targetType: "user", targetId: user.id });
    res.json({ message: "Password reset; user will be prompted to change it" });
  })
);

export default router;
