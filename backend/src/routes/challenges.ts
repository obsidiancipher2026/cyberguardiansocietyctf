import path from "path";
import { Router } from "express";
import Joi from "joi";
import { Op } from "sequelize";
import { sequelize, Challenge, Hint, HintPurchase, Submission, User, Team } from "../models";
import { config } from "../config";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { strictLimiter } from "../middleware/rateLimiter";
import { asyncHandler, notFound, forbidden, conflict } from "../utils/errors";
import { hashFlag, verifyFlag, isValidFlagFormat, jitterDelay, sha256 } from "../utils/crypto";
import { getCompetitionState, submissionsAllowed } from "../services/competition";
import { submissionGuard } from "../services/submissionGuard";
import { adminEvents } from "../services/adminEvents";
import { hub } from "../services/realtime";
import { logActivity } from "../services/activityLog";
import { clientIp } from "../utils/ip";
import type { PublicChallenge } from "@cgs-ctf/shared";

const router = Router();

export function challengePoints(challenge: Challenge): number {
  if (!challenge.isDynamic) return challenge.basePoints;
  const decayed = challenge.basePoints * Math.pow(challenge.decayFactor, challenge.solveCount);
  return Math.max(challenge.minPoints, Math.floor(decayed));
}

async function serializeChallenge(
  challenge: Challenge,
  user: User | null
): Promise<PublicChallenge> {
  const hints = await Hint.findAll({
    where: { challengeId: challenge.id },
    order: [["order", "ASC"]],
  });

  let solved = false;
  let attemptsUsed = 0;
  if (user) {
    const correct = await Submission.findOne({
      where: { userId: user.id, challengeId: challenge.id, isCorrect: true },
    });
    solved = Boolean(correct);
    attemptsUsed = await Submission.count({
      where: { userId: user.id, challengeId: challenge.id },
    });
  }

  let purchasedIds: number[] = [];
  if (user) {
    const purchases = await HintPurchase.findAll({
      where: { userId: user.id, hintId: { [Op.in]: hints.map((h) => h.id) } },
    });
    purchasedIds = purchases.map((p) => p.hintId);
  }

  let author = "CGS Operations";
  if (challenge.createdBy) {
    const creator = await User.findByPk(challenge.createdBy, { attributes: ["username"] });
    if (creator) author = creator.username;
  }

  return {
    id: challenge.id,
    title: challenge.title,
    category: challenge.category,
    description: challenge.description,
    longDescription: challenge.description,
    points: challengePoints(challenge),
    bloodPoints: challenge.bloodPoints,
    difficulty: challenge.difficulty,
    solves: challenge.solveCount,
    solved,
    maxAttempts: challenge.maxAttempts,
    attemptsUsed,
    attachments: challenge.attachments.map((a) => ({ name: a.name, url: `/api/challenges/${challenge.id}/attachment/${encodeURIComponent(a.filename)}` })),
    hints: hints.map((h) => ({
      id: h.id,
      cost: h.cost,
      revealed: purchasedIds.includes(h.id),
      text: purchasedIds.includes(h.id) ? h.content : null,
    })),
    tags: challenge.tags,
    author,
    released: challenge.createdAt.toISOString(),
  };
}

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const challenges = await Challenge.findAll({
      where: { visibility: "live" },
      order: [["category", "ASC"], ["basePoints", "ASC"]],
    });
    const user = req.user ?? null;
    const list = await Promise.all(challenges.map((c) => serializeChallenge(c, user)));
    res.json({ challenges: list });
  })
);

router.get(
  "/:id",
  requireAuth,
  validate(Joi.object({ id: Joi.number().integer().positive().required() })),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findOne({
      where: { id: req.params.id, visibility: "live" },
    });
    if (!challenge) throw notFound();
    res.json({ challenge: await serializeChallenge(challenge, req.user ?? null) });
  })
);

router.get(
  "/:id/attachment/:filename",
  requireAuth,
  validate(Joi.object({ id: Joi.number().integer().positive().required(), filename: Joi.string().required() })),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findOne({
      where: { id: req.params.id, visibility: "live" },
    });
    if (!challenge) throw notFound();

    const attachment = challenge.attachments.find((a) => a.filename === req.params.filename);
    if (!attachment) throw notFound();

    const filePath = path.resolve(config.upload.dir, attachment.filename);
    const root = path.resolve(config.upload.dir);
    if (!filePath.startsWith(root)) throw notFound();

    res.download(filePath, attachment.name, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment missing" } });
      }
    });
  })
);

router.post(
  "/:id/submit",
  requireAuth,
  strictLimiter(60, 60_000),
  validate(Joi.object({ id: Joi.number().integer().positive().required(), flag: Joi.string().max(256).required() })),
  asyncHandler(async (req, res) => {
    const state = await getCompetitionState();
    if (state.maintenanceMode) throw forbidden("Submissions are temporarily disabled");
    if (state.submissionsKilled) {
      return res.status(403).json({
        result: "killed",
        message: "Flag submissions are temporarily disabled by the organizers",
      });
    }
    if (!submissionsAllowed(state)) {
      return res.status(403).json({
        result: "locked",
        message: "The competition is not currently accepting submissions",
      });
    }

    const challenge = await Challenge.findOne({
      where: { id: req.params.id, visibility: "live" },
    });
    if (!challenge) throw notFound();

    const user = req.user!;
    const ip = clientIp(req);
    const userKey = `user:${user.id}`;

    // Real, automated flag-guessing protection.
    const activeBlock = submissionGuard.isBlocked(userKey, ip);
    if (activeBlock) {
      return res.status(429).json({
        result: "rate_limited",
        message: "Too many flag submissions — temporarily blocked as suspected automated guessing.",
        retryAfterSeconds: Math.max(1, Math.ceil((activeBlock.until - Date.now()) / 1000)),
      });
    }

    const already = await Submission.findOne({
      where: { userId: user.id, challengeId: challenge.id, isCorrect: true },
    });
    if (already) {
      return res.status(200).json({ result: "already_solved", message: "You already solved this challenge" });
    }

    const attemptsUsed = await Submission.count({
      where: { userId: user.id, challengeId: challenge.id },
    });
    if (challenge.maxAttempts != null && attemptsUsed >= challenge.maxAttempts) {
      return res.status(200).json({ result: "max_attempts", message: "No attempts remaining for this challenge" });
    }

    // Normalise the submission once (trim + Unicode NFC) so equivalent flags
    // (surrounding whitespace / canonical encoding) always verify the same way.
    const rawFlag = String(req.body.flag).trim().normalize("NFC");

    // Reject flags that cannot possibly be valid. Format is public knowledge,
    // so this leaks nothing, but it keeps garbage out of the attempt ledger.
    if (!isValidFlagFormat(rawFlag)) {
      // Record the attempt anyway (hashed only, never the plaintext) so the
      // Submission Logs section reflects every single flag submission.
      await Submission.create({
        userId: user.id,
        challengeId: challenge.id,
        isCorrect: false,
        ipAddress: ip,
        flagHash: hashFlag(rawFlag),
      });
      adminEvents.broadcast("submission", {
        type: "invalid_format",
        userId: user.id,
        challengeId: challenge.id,
        ipAddress: ip,
      });
      return res.status(200).json({
        result: "invalid_format",
        message: "Flag must match the official CGS{...} format",
      });
    }

    // Constant-time verification against the stored fingerprint. Supports the
    // current HMAC scheme and legacy hashes from before the upgrade.
    const correct = verifyFlag(rawFlag, challenge.flagHash);
    const flagHash = hashFlag(rawFlag);

    if (!correct) {
      // Randomised delay before answering: destroys timing oracles and makes
      // automated guessing materially slower than the guard alone.
      await jitterDelay(250, 450);

      await Submission.create({
        userId: user.id,
        challengeId: challenge.id,
        isCorrect: false,
        ipAddress: ip,
        flagHash,
      });
      const remaining =
        challenge.maxAttempts != null
          ? Math.max(0, challenge.maxAttempts - attemptsUsed - 1)
          : null;
      submissionGuard.record(userKey, ip);
      adminEvents.broadcast("submission", {
        type: "incorrect",
        userId: user.id,
        challengeId: challenge.id,
        ipAddress: ip,
      });
      return res.status(200).json({
        result: "incorrect",
        message: "Incorrect flag",
        ...(remaining !== null ? { remainingAttempts: remaining } : {}),
      });
    }

    const points = challengePoints(challenge);
    const transaction = await sequelize.transaction();
    let isFirstBlood = false;
    let totalAward = points;
    let bloodBonus = 0;
    try {
      // Re-check under the transaction's row lock so two concurrent correct
      // submissions can never double-award points or double-increment solves.
      const locked = await Challenge.findByPk(challenge.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked) throw notFound();

      const solved = await Submission.findOne({
        where: { userId: user.id, challengeId: challenge.id, isCorrect: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (solved) {
        await transaction.rollback();
        return res.status(200).json({ result: "already_solved", message: "You already solved this challenge" });
      }

      // First solver on the challenge draws first blood: the configured blood
      // bonus is stacked on top of the regular score points.
      const firstBloodSub = await Submission.findOne({
        where: { challengeId: challenge.id, isCorrect: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      isFirstBlood = !firstBloodSub;
      bloodBonus = isFirstBlood ? locked.bloodPoints : 0;
      totalAward = points + bloodBonus;

      await Submission.create(
        {
          userId: user.id,
          challengeId: challenge.id,
          isCorrect: true,
          pointsAwarded: totalAward,
          bloodPointsAwarded: bloodBonus,
          ipAddress: ip,
          flagHash,
        },
        { transaction }
      );
      await locked.increment("solveCount", { transaction });
      if (user.teamId) {
        await Team.increment("points", { by: totalAward, where: { id: user.teamId }, transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    submissionGuard.record(userKey, ip);

    // Equalised response delay on the success path so the endpoint's total
    // latency carries no correctness signal (kills the timing oracle).
    await jitterDelay(250, 450);

    adminEvents.broadcast("submission", {
      type: "correct",
      userId: user.id,
      username: user.username,
      challengeId: challenge.id,
      points: totalAward,
      firstBlood: isFirstBlood,
    });
    hub.broadcast("scoreboard", {
      type: "solve",
      challengeId: challenge.id,
      points: totalAward,
    });

    res.status(200).json({
      result: "correct",
      points: totalAward,
      bloodPoints: bloodBonus,
      firstBlood: isFirstBlood,
      message: isFirstBlood
        ? `Flag accepted. +${totalAward} points (incl. ${bloodBonus} first-blood bonus) — FIRST BLOOD!`
        : `Flag accepted. +${points} points`,
    });
  })
);

router.post(
  "/:id/hint/:hid",
  requireAuth,
  strictLimiter(30, 60_000),
  validate(
    Joi.object({ id: Joi.number().integer().positive().required(), hid: Joi.number().integer().positive().required() })
  ),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findOne({
      where: { id: req.params.id, visibility: "live" },
    });
    if (!challenge) throw notFound();

    const hint = await Hint.findOne({ where: { id: req.params.hid, challengeId: challenge.id } });
    if (!hint) throw notFound();

    const user = req.user!;

    const transaction = await sequelize.transaction();
    try {
      // Row-lock the purchase row so two concurrent purchases of the same
      // hint can never both decrement the team balance.
      const existing = await HintPurchase.findOne({
        where: { userId: user.id, hintId: hint.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) {
        await transaction.rollback();
        return res.json({ hint: { id: hint.id, content: hint.content, cost: hint.cost } });
      }

      const already = await Submission.findOne({
        where: { userId: user.id, challengeId: challenge.id, isCorrect: true },
        transaction,
      });
      if (already) {
        await transaction.rollback();
        return res.json({ hint: { id: hint.id, content: hint.content, cost: hint.cost } });
      }

      if (hint.cost > 0) {
        const teamPoints = user.teamId ? await Team.findByPk(user.teamId, { transaction, lock: transaction.LOCK.UPDATE }) : null;
        const balance = teamPoints ? teamPoints.points : 0;
        if (balance < hint.cost) {
          await transaction.rollback();
          throw conflict("Not enough points to purchase this hint");
        }
        if (teamPoints) await teamPoints.decrement("points", { by: hint.cost, transaction });
      }

      await HintPurchase.create({ userId: user.id, hintId: hint.id, cost: hint.cost }, { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    await logActivity(req, {
      category: "hint",
      action: "hint.purchase",
      message: `${user.username} purchased a hint for ${challenge.title}`,
      userId: user.id,
      targetType: "challenge",
      targetId: challenge.id,
      details: { hintId: hint.id, cost: hint.cost },
    });
    res.json({ hint: { id: hint.id, content: hint.content, cost: hint.cost } });
  })
);

export default router;
