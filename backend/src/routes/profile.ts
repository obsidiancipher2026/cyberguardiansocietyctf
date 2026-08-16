import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import { Sequelize } from "sequelize";
import { Challenge, HintPurchase, Submission, Team, User } from "../models";
import { config } from "../config";
import { requireAuth } from "../middleware/auth";
import { validate, passwordSchema } from "../middleware/validate";
import { asyncHandler, conflict, unauthorized } from "../utils/errors";
import { logActivity } from "../services/activityLog";

const router = Router();

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [solves, hintSpent] = await Promise.all([
      Submission.findAll({
        where: { userId: user.id, isCorrect: true },
        include: [
          {
            model: Challenge,
            as: "challenge",
            attributes: ["id", "title", "category", "basePoints", "isDynamic", "minPoints", "decayFactor", "solveCount"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
      HintPurchase.findAll({ where: { userId: user.id } }).then((p) => p.reduce((sum, x) => sum + x.cost, 0)),
    ]);

    const myPoints =
      (await Submission.sum("pointsAwarded", { where: { userId: user.id, isCorrect: true } })) ?? 0;
    const myBlood =
      (await Submission.sum("bloodPointsAwarded", { where: { userId: user.id, isCorrect: true } })) ?? 0;

    // Rank via SQL aggregate: count of users with strictly more points + 1.
    // Never materialises the whole submission table (DoS-safe at scale).
    const above = await Submission.findAll({
      attributes: [
        "userId",
        [Sequelize.fn("SUM", Sequelize.col("pointsAwarded")), "pts"],
      ],
      where: { isCorrect: true },
      group: ["userId"],
      having: Sequelize.where(Sequelize.fn("SUM", Sequelize.col("pointsAwarded")), ">", myPoints),
      raw: true,
    });
    const myRank = above.length + 1;

    res.json({
      user: user.toPublic(),
      stats: {
        points: myPoints,
        bloodPoints: myBlood,
        rank: myRank || null,
        solves: solves.length,
        totalSubmissions: await Submission.count({ where: { userId: user.id } }),
        hintSpent,
        teamPoints: user.teamId ? (await Team.findByPk(user.teamId))?.points ?? 0 : 0,
      },
      solves: solves.map((s) => ({
        id: s.id,
        at: s.createdAt.toISOString(),
        points: s.pointsAwarded,
        challenge: s.challenge
          ? { id: s.challenge.id, title: s.challenge.title, category: s.challenge.category }
          : null,
      })),
    });
  })
);

router.patch(
  "/me",
  requireAuth,
  validate(
    Joi.object({
      username: Joi.string().pattern(/^[a-z0-9]+$/).min(3).max(20).optional().messages({
        "string.pattern.base": "Username can only contain lowercase letters and numbers",
      }),
      teamName: Joi.string().min(2).max(64).allow(null).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const updates: Record<string, unknown> = {};

    if (req.body.username && req.body.username !== user.username) {
      const existing = await User.findOne({ where: { username: req.body.username } });
      if (existing) throw conflict("Username is already taken");
      updates.username = req.body.username;
    }

    if (req.body.teamName !== undefined) {
      if (req.body.teamName === null) {
        if (user.teamId) {
          const team = await Team.findByPk(user.teamId);
          if (team && team.ownerId === user.id) await team.destroy();
          await user.update({ teamId: null });
        }
      } else {
        const team = user.teamId
          ? await Team.findByPk(user.teamId)
          : await Team.create({ name: req.body.teamName, ownerId: user.id });
        if (!team) throw new Error("team missing");
        if (team.ownerId !== user.id) throw unauthorized("You do not own this team");
        await team.update({ name: req.body.teamName });
        if (!user.teamId) await user.update({ teamId: team.id });
      }
    }

    await user.update(updates);
    if (req.body.username !== undefined || req.body.teamName !== undefined) {
      await logActivity(req, {
        category: "account",
        action: "profile.update",
        message: `${user.username} updated their profile`,
        userId: user.id,
        details: {
          usernameChanged: req.body.username !== undefined,
          teamChanged: req.body.teamName !== undefined,
        },
      });
    }
    res.json({ user: user.toPublic() });
  })
);

router.post(
  "/me/password",
  requireAuth,
  validate(
    Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: passwordSchema.required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!ok) throw unauthorized("Current password is incorrect");

    const passwordHash = await bcrypt.hash(req.body.newPassword, config.bcryptRounds);
    await user.update({ passwordHash, mustChangePassword: false });
    await logActivity(req, {
      category: "account",
      action: "password.change",
      message: `${user.username} changed their passphrase`,
      userId: user.id,
      targetType: "user",
      targetId: user.id,
    });
    res.json({ message: "Password changed" });
  })
);

export default router;
