import { Router } from "express";
import Joi from "joi";
import { Op } from "sequelize";
import {
  ActivityLog,
  AdminAuditLog,
  AdminLoginAttempt,
  AdminSession,
  Announcement,
  Challenge,
  Competition,
  Hint,
  HintPurchase,
  IpBlock,
  RefreshToken,
  Submission,
  Team,
  User,
} from "../../models";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler } from "../../utils/errors";
import { logAudit } from "../../services/adminAudit";
import { adminEvents } from "../../services/adminEvents";
import { hub } from "../../services/realtime";
import { getCompetitionState } from "../../services/competition";

const router = Router();
router.use(requireAdmin);

async function broadcastCompetition(): Promise<void> {
  hub.broadcast("competition", { ...(await getCompetitionState()) });
}

async function resetScores(): Promise<void> {
  await Challenge.update({ solveCount: 0 }, { where: {} });
  await Team.update({ points: 0 }, { where: {} });
  hub.broadcast("scoreboard", { action: "reset" });
}

router.post("/logs", asyncHandler(async (req, res) => {
  const deleted = await ActivityLog.destroy({ where: {} });
  await logAudit(req, { category: "danger", action: "logs.wipe", details: { deleted } });
  adminEvents.broadcast("danger", { action: "logs.wipe", deleted });
  res.json({ message: `Wiped ${deleted} entries from the logs management section`, deleted });
}));

router.post("/submissions", asyncHandler(async (req, res) => {
  const deleted = await Submission.destroy({ where: {} });
  await resetScores();
  await logAudit(req, { category: "danger", action: "submissions.wipe", details: { deleted } });
  adminEvents.broadcast("danger", { action: "submissions.wipe", deleted });
  res.json({ message: `Wiped ${deleted} submissions and reset all scores`, deleted });
}));

// Wipe every team's points (and their solve counts) off the scoreboard.
router.post("/scoreboard", asyncHandler(async (req, res) => {
  const deleted = await Submission.destroy({ where: {} });
  await resetScores();
  await logAudit(req, { category: "danger", action: "scoreboard.wipe", details: { deleted } });
  adminEvents.broadcast("danger", { action: "scoreboard.wipe", deleted });
  adminEvents.broadcast("challenges.refresh", { action: "scoreboard.wipe" });
  res.json({ message: `Wiped ${deleted} submissions and cleared every team's points from the scoreboard`, deleted });
}));

const blockIpSchema = Joi.object({
  ip: Joi.string().trim().min(1).max(64).required(),
  reason: Joi.string().trim().max(255).allow("").default("Blocked by administrator"),
});

router.get("/ip-blocks", asyncHandler(async (_req, res) => {
  const blocks = await IpBlock.findAll({ order: [["createdAt", "DESC"]], limit: 500 });
  res.json({ blocks, total: blocks.length });
}));

router.post("/ip-blocks", validate(blockIpSchema), asyncHandler(async (req, res) => {
  const [block, created] = await IpBlock.findOrCreate({
    where: { ip: req.body.ip },
    defaults: { ip: req.body.ip, reason: req.body.reason, blockedBy: req.admin!.id },
  });
  if (!created) {
    res.json({ message: `IP ${block.ip} was already blocked`, block });
    return;
  }
  await logAudit(req, { category: "danger", action: "ip.block", targetType: "ip", targetId: block.ip, details: { reason: block.reason } });
  res.json({ message: `IP ${block.ip} blocked`, block });
}));

router.delete(
  "/ip-blocks/:id",
  validate(Joi.object({ id: Joi.number().integer().positive().required() })),
  asyncHandler(async (req, res) => {
    const block = await IpBlock.findByPk(req.params.id);
    if (!block) {
      res.json({ message: "IP block already removed" });
      return;
    }
    await block.destroy();
    await logAudit(req, { category: "danger", action: "ip.unblock", targetType: "ip", targetId: block.ip });
    res.json({ message: `IP ${block.ip} unblocked` });
  })
);

router.post("/ip-blocks/block-all", asyncHandler(async (req, res) => {
  const sources = await Promise.all([
    Submission.findAll({ attributes: ["ipAddress"], raw: true }),
    ActivityLog.findAll({ attributes: ["ipAddress"], raw: true }),
    RefreshToken.findAll({ attributes: ["ipAddress"], raw: true }),
    AdminLoginAttempt.findAll({ attributes: ["ipAddress"], raw: true }),
    AdminAuditLog.findAll({ attributes: ["ipAddress"], raw: true }),
  ]);
  const ips = [
    ...new Set(
      sources
        .flat()
        .map((r) => (r.ipAddress || "").trim())
        .filter((ip) => ip.length > 0 && ip !== "unknown")
    ),
  ];
  let created = 0;
  for (const ip of ips) {
    const [, wasCreated] = await IpBlock.findOrCreate({
      where: { ip },
      defaults: { ip, reason: "Bulk block from danger zone", blockedBy: req.admin!.id },
    });
    if (wasCreated) created++;
  }
  await logAudit(req, { category: "danger", action: "ip.block_all", details: { candidates: ips.length, created } });
  res.json({ message: `Blocked ${created} unique IP address${created === 1 ? "" : "es"}`, candidates: ips.length, created });
}));

router.post("/ip-blocks/unblock-all", asyncHandler(async (req, res) => {
  const deleted = await IpBlock.destroy({ where: {} });
  await logAudit(req, { category: "danger", action: "ip.unblock_all", details: { deleted } });
  res.json({ message: `Unblocked ${deleted} IP address${deleted === 1 ? "" : "es"}`, deleted });
}));

router.post("/users", asyncHandler(async (req, res) => {
  const users = await User.findAll({ where: { role: "user" } });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) {
    res.json({ message: "No users to delete", deleted: 0 });
    return;
  }
  await Submission.destroy({ where: { userId: { [Op.in]: ids } } });
  await HintPurchase.destroy({ where: { userId: { [Op.in]: ids } } });
  await RefreshToken.destroy({ where: { userId: { [Op.in]: ids } } });
  await AdminSession.destroy({ where: { adminId: { [Op.in]: ids } } });
  const teamIds = [...new Set(users.filter((u) => u.teamId).map((u) => u.teamId as number))];
  if (teamIds.length) await Team.destroy({ where: { id: { [Op.in]: teamIds } } });
  await User.destroy({ where: { id: { [Op.in]: ids } } });
  await resetScores();
  await logAudit(req, { category: "danger", action: "users.wipe", details: { deleted: ids.length } });
  adminEvents.broadcast("danger", { action: "users.wipe", deleted: ids.length });
  adminEvents.broadcast("users.refresh", { action: "wipe" });
  res.json({ message: `Permanently deleted ${ids.length} user${ids.length === 1 ? "" : "s"}`, deleted: ids.length });
}));

router.post("/challenges", asyncHandler(async (req, res) => {
  const challengeIds = (await Challenge.findAll({ attributes: ["id"], raw: true })).map((c) => c.id);
  if (challengeIds.length === 0) {
    res.json({ message: "No challenges to delete", deleted: 0 });
    return;
  }
  const hintIds = (
    await Hint.findAll({ attributes: ["id"], where: { challengeId: { [Op.in]: challengeIds } }, raw: true })
  ).map((h) => h.id);
  await Submission.destroy({ where: { challengeId: { [Op.in]: challengeIds } } });
  if (hintIds.length) await HintPurchase.destroy({ where: { hintId: { [Op.in]: hintIds } } });
  await Hint.destroy({ where: { challengeId: { [Op.in]: challengeIds } } });
  await Challenge.destroy({ where: { id: { [Op.in]: challengeIds } } });
  await resetScores();
  await logAudit(req, { category: "danger", action: "challenges.wipe", details: { deleted: challengeIds.length } });
  adminEvents.broadcast("danger", { action: "challenges.wipe", deleted: challengeIds.length });
  adminEvents.broadcast("challenges.refresh", { action: "wipe" });
  res.json({ message: `Permanently deleted ${challengeIds.length} challenge${challengeIds.length === 1 ? "" : "s"}`, deleted: challengeIds.length });
}));

router.post("/announcements", asyncHandler(async (req, res) => {
  const deleted = await Announcement.destroy({ where: {} });
  await logAudit(req, { category: "danger", action: "announcements.wipe", details: { deleted } });
  hub.broadcast("announcement", { action: "wipe" });
  res.json({ message: `Deleted ${deleted} announcement${deleted === 1 ? "" : "s"}`, deleted });
}));

router.post("/reset-competition", asyncHandler(async (req, res) => {
  const deleted = await Submission.destroy({ where: {} });
  await resetScores();
  const competition = await Competition.findOne({ order: [["id", "DESC"]] });
  if (competition) {
    await competition.update({
      status: "upcoming",
      startTime: null,
      endTime: null,
      submissionsKilled: false,
      scoreboardFrozen: false,
    });
  }
  await broadcastCompetition();
  await logAudit(req, { category: "danger", action: "competition.reset", details: { deleted } });
  adminEvents.broadcast("danger", { action: "competition.reset", deleted });
  res.json({ message: "Competition progress wiped and countdown timer reset", deleted });
}));

router.post("/force-password-reset", asyncHandler(async (req, res) => {
  const [affected] = await User.update({ mustChangePassword: true }, { where: { role: "user" } });
  const revoked = await RefreshToken.update({ revoked: true }, { where: {} });
  await logAudit(req, { category: "danger", action: "users.force_password_reset", details: { affected, sessionsRevoked: revoked[0] } });
  res.json({ message: `Forced ${affected} user${affected === 1 ? "" : "s"} to change their password on next sign-in`, affected });
}));

router.post("/audit", asyncHandler(async (req, res) => {
  const deleted = await AdminAuditLog.destroy({ where: {} });
  await logAudit(req, { category: "danger", action: "audit.wipe", details: { deleted } });
  res.json({ message: `Wiped ${deleted} entries from the security audit trail`, deleted });
}));

export default router;