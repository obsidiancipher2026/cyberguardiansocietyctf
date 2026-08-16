import { Router } from "express";
import Joi from "joi";
import { Op, type WhereOptions } from "sequelize";
import { sequelize } from "../../db";
import { Submission, User, Challenge } from "../../models";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, notFound } from "../../utils/errors";
import { logAudit } from "../../services/adminAudit";
import { adminEvents } from "../../services/adminEvents";

const router = Router();
router.use(requireAdmin);

function qp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

const listSchema = Joi.object({
  search: Joi.string().trim().max(128).allow(""),
  userId: Joi.number().integer().min(1),
  challengeId: Joi.number().integer().min(1),
  correct: Joi.string().valid("true", "false"),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

router.get(
  "/",
  validate(listSchema),
  asyncHandler(async (req, res) => {
    const search = qp(req.query.search);
    const userId = qp(req.query.userId) ? parseInt(qp(req.query.userId)!, 10) : undefined;
    const challengeId = qp(req.query.challengeId) ? parseInt(qp(req.query.challengeId)!, 10) : undefined;
    const correct = qp(req.query.correct);
    const from = qp(req.query.from) ? new Date(qp(req.query.from)!) : undefined;
    const to = qp(req.query.to) ? new Date(qp(req.query.to)!) : undefined;

    const where: WhereOptions = {};
    if (userId) where.userId = userId;
    if (challengeId) where.challengeId = challengeId;
    if (correct) where.isCorrect = correct === "true";

    const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
    if (from && !Number.isNaN(from.getTime())) range[Op.gte] = from;
    if (to && !Number.isNaN(to.getTime())) range[Op.lte] = to;
    if (Object.keys(range).length) where.createdAt = range;

    const rows = await Submission.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        { model: Challenge, as: "challenge", attributes: ["id", "title", "category"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (search) {
      const needle = search.toLowerCase();
      const filtered = rows.filter((s) =>
        [s.user?.username, s.user?.email, s.challenge?.title, String(s.ipAddress ?? "")].some((v) => v && v.toLowerCase().includes(needle))
      );
      res.json({
        total: filtered.length,
        submissions: filtered.map(serialize),
      });
      return;
    }

    res.json({
      total: rows.length,
      submissions: rows.map(serialize),
    });
  })
);

function serialize(s: Submission) {
  return {
    id: s.id,
    username: s.user?.username ?? "unknown",
    userEmail: s.user?.email ?? null,
    userId: s.userId,
    challengeId: s.challengeId,
    challenge: s.challenge?.title ?? `#${s.challengeId}`,
    category: s.challenge?.category ?? null,
    isCorrect: s.isCorrect,
    pointsAwarded: s.pointsAwarded,
    bloodPointsAwarded: s.bloodPointsAwarded,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [total, correct, incorrect, uniqueUsers, uniqueChallenges, perChallenge, perUser] = await Promise.all([
      Submission.count(),
      Submission.count({ where: { isCorrect: true } }),
      Submission.count({ where: { isCorrect: false } }),
      Submission.count({ distinct: true, col: "userId" }),
      Submission.count({ distinct: true, col: "challengeId" }),
      Submission.findAll({
        attributes: ["challengeId", [sequelize.fn("COUNT", sequelize.col("Submission.id")), "attempts"]],
        include: [{ model: Challenge, as: "challenge", attributes: ["id", "title", "category"] }],
        group: ["challengeId"],
        order: [[sequelize.fn("COUNT", sequelize.col("Submission.id")), "DESC"]],
        limit: 20,
        subQuery: false,
      }),
      Submission.findAll({
        attributes: ["userId", [sequelize.fn("COUNT", sequelize.col("Submission.id")), "attempts"]],
        include: [{ model: User, as: "user", attributes: ["id", "username"] }],
        group: ["userId"],
        order: [[sequelize.fn("COUNT", sequelize.col("Submission.id")), "DESC"]],
        limit: 20,
        subQuery: false,
      }),
    ]);

    res.json({
      totals: {
        total,
        correct,
        incorrect,
        accuracy: total ? Math.round((correct / total) * 1000) / 10 : 0,
        uniqueUsers,
        uniqueChallenges,
      },
      perChallenge: perChallenge.map((r: any) => ({
        challengeId: r.challengeId,
        title: r.challenge?.title ?? `#${r.challengeId}`,
        category: r.challenge?.category ?? null,
        attempts: Number(r.get?.("attempts") ?? r.attempts) || 0,
      })),
      perUser: perUser.map((r: any) => ({
        userId: r.userId,
        username: r.user?.username ?? "unknown",
        attempts: Number(r.get?.("attempts") ?? r.attempts) || 0,
      })),
    });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const submission = await Submission.findByPk(req.params.id);
    if (!submission) throw notFound();

    if (submission.isCorrect) {
      const challenge = await Challenge.findByPk(submission.challengeId);
      if (challenge) {
        await challenge.update({ solveCount: Math.max(0, challenge.solveCount - 1) });
      }
    }
    await submission.destroy();
    await logAudit(req, { category: "submissions", action: "submission.delete", targetType: "submission", targetId: submission.id });
    adminEvents.broadcast("submission", { action: "deleted", submissionId: submission.id });
    res.json({ message: "Submission deleted" });
  })
);

export default router;
