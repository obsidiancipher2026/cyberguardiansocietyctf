import { Router } from "express";
import Joi from "joi";
import { Op, type WhereOptions } from "sequelize";
import fs from "fs";
import path from "path";
import multer from "multer";
import { Challenge, Hint, Submission, User } from "../../models";
import { CHALLENGE_CATEGORIES, type ChallengeCategory, type ChallengeDifficulty, type ChallengeVisibility } from "@cgs-ctf/shared";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, conflict, notFound, validationError } from "../../utils/errors";
import { hashFlag } from "../../utils/crypto";
import { logAudit } from "../../services/adminAudit";
import { adminEvents } from "../../services/adminEvents";
import { likePattern } from "../../utils/search";
import { config } from "../../config";

const router = Router();
router.use(requireAdmin);

fs.mkdirSync(config.upload.dir, { recursive: true });

const uploader = multer({
  storage: multer.diskStorage({
    destination: config.upload.dir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 20);
      cb(null, `ch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    },
  }),
  limits: { fileSize: config.upload.maxMb * 1024 * 1024, files: 1 },
});

function qp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

const listSchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(1000),
  search: Joi.string().trim().max(128).allow(""),
  category: Joi.string().valid(...CHALLENGE_CATEGORIES),
  visibility: Joi.string().valid("draft", "hidden", "live"),
});

router.get(
  "/",
  validate(listSchema),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(qp(req.query.limit) ?? "20", 10) || 20));
    const search = qp(req.query.search);
    const category = qp(req.query.category);
    const visibility = qp(req.query.visibility);

    const where: WhereOptions = {};
    if (search) {
      Object.assign(where, { [Op.or]: [{ title: { [Op.like]: likePattern(search) } }, { description: { [Op.like]: likePattern(search) } }, { tags: { [Op.like]: likePattern(search) } }] });
    }
    if (category) where.category = category;
    if (visibility) where.visibility = visibility;

    const { rows, count } = await Challenge.findAndCountAll({
      where,
      include: [{ model: Hint, as: "hints", attributes: ["id", "content", "cost", "order"] }],
      order: [["id", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });

    const ids = rows.map((c) => c.id);
    const attemptCounts = await Submission.count({ where: { challengeId: { [Op.in]: ids } }, group: ["challengeId"] });
    const attemptMap = new Map(
      (attemptCounts as unknown as { challengeId: number; count: number }[]).map((r) => [r.challengeId, r.count])
    );

    res.json({
      total: count,
      page,
      limit,
      challenges: rows.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        visibility: c.visibility,
        basePoints: c.basePoints,
        bloodPoints: c.bloodPoints,
        isDynamic: c.isDynamic,
        minPoints: c.minPoints,
        decayFactor: c.decayFactor,
        solveCount: c.solveCount,
        attempts: attemptMap.get(c.id) ?? 0,
        maxAttempts: c.maxAttempts,
        tags: c.tags,
        updatedAt: c.updatedAt.toISOString(),
        hints: (c.hints ?? []).map((h) => ({ id: h.id, content: h.content, cost: h.cost })),
        hintCount: (c.hints ?? []).length,
      })),
    });
  })
);

const challengeSchema = Joi.object({
  title: Joi.string().trim().min(3).max(128).required(),
  category: Joi.string().valid(...CHALLENGE_CATEGORIES).required(),
  description: Joi.string().max(20_000).allow("").default(""),
  basePoints: Joi.number().integer().min(1).max(100_000).required(),
  bloodPoints: Joi.number().integer().min(0).max(100_000).optional(),
  isDynamic: Joi.boolean().default(false),
  minPoints: Joi.number().integer().min(0).max(100_000).optional(),
  decayFactor: Joi.number().min(0.5).max(1).optional(),
  flag: Joi.string().pattern(/^CGS\{[\s\S]+\}$/).max(512).required().messages({
    "string.pattern.base": "Flag must follow the format CGS{...}",
  }),
  difficulty: Joi.string().valid("easy", "medium", "hard", "insane").default("medium"),
  visibility: Joi.string().valid("draft", "hidden", "live").default("draft"),
  maxAttempts: Joi.number().integer().min(0).max(1000).optional().allow(null),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(20).default([]),
});

router.post(
  "/",
  validate(challengeSchema),
  asyncHandler(async (req, res) => {
    const { title, category, description, basePoints, bloodPoints, isDynamic, minPoints, decayFactor, flag, difficulty, visibility, maxAttempts, tags } = req.body;
    const existing = await Challenge.findOne({ where: { title } });
    if (existing) throw conflict("A challenge with this title already exists");

    const challenge = await Challenge.create({
      title,
      category: category as ChallengeCategory,
      description,
      basePoints,
      bloodPoints: bloodPoints ?? basePoints,
      isDynamic,
      minPoints: minPoints ?? Math.round(basePoints * 0.5),
      decayFactor: decayFactor ?? 0.95,
      flagHash: hashFlag(flag),
      difficulty: difficulty as ChallengeDifficulty,
      visibility: visibility as ChallengeVisibility,
      maxAttempts: maxAttempts ?? null,
      tags,
      createdBy: req.admin!.id,
    });
    await logAudit(req, { category: "challenges", action: "challenge.create", targetType: "challenge", targetId: challenge.id, details: { title } });
    adminEvents.broadcast("challenges.refresh", { action: "created", challengeId: challenge.id });
    res.status(201).json({ message: "Challenge created", id: challenge.id });
  })
);

const bulkVisibilitySchema = Joi.object({
  category: Joi.string().valid(...CHALLENGE_CATEGORIES).required(),
  visibility: Joi.string().valid("draft", "hidden", "live").required(),
});

router.post(
  "/bulk-visibility",
  validate(bulkVisibilitySchema),
  asyncHandler(async (req, res) => {
    const [count] = await Challenge.update(
      { visibility: req.body.visibility as ChallengeVisibility },
      { where: { category: req.body.category } }
    );
    await logAudit(req, {
      category: "challenges",
      action: "challenge.bulk_visibility",
      targetType: "challenge",
      details: { category: req.body.category, visibility: req.body.visibility, count },
    });
    adminEvents.broadcast("challenges.refresh", { action: "bulk_visibility", count });
    res.json({ message: `Updated ${count} challenge(s) in ${req.body.category}`, count });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id, {
      include: [{ model: Hint, as: "hints", order: [["order", "ASC"]] }],
    });
    if (!challenge) throw notFound();
    res.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        category: challenge.category,
        description: challenge.description,
        basePoints: challenge.basePoints,
        bloodPoints: challenge.bloodPoints,
        isDynamic: challenge.isDynamic,
        minPoints: challenge.minPoints,
        decayFactor: challenge.decayFactor,
        difficulty: challenge.difficulty,
        visibility: challenge.visibility,
        maxAttempts: challenge.maxAttempts,
        solveCount: challenge.solveCount,
        tags: challenge.tags,
        attachments: challenge.attachments,
        dockerImage: challenge.dockerImage,
        dockerPorts: challenge.dockerPorts,
        hints: challenge.hints ?? [],
        updatedAt: challenge.updatedAt.toISOString(),
      },
    });
  })
);

const patchSchema = Joi.object({
  title: Joi.string().trim().min(3).max(128),
  category: Joi.string().valid(...CHALLENGE_CATEGORIES),
  description: Joi.string().max(20_000),
  basePoints: Joi.number().integer().min(1).max(100_000),
  bloodPoints: Joi.number().integer().min(0).max(100_000),
  isDynamic: Joi.boolean(),
  minPoints: Joi.number().integer().min(0).max(100_000),
  decayFactor: Joi.number().min(0.5).max(1),
  flag: Joi.string().pattern(/^CGS\{[\s\S]+\}$/).max(512).optional().messages({
    "string.pattern.base": "Flag must follow the format CGS{...}",
  }),
  difficulty: Joi.string().valid("easy", "medium", "hard", "insane"),
  visibility: Joi.string().valid("draft", "hidden", "live"),
  maxAttempts: Joi.number().integer().min(0).max(1000).allow(null),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(20),
});

router.patch(
  "/:id",
  validate(patchSchema),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) throw notFound();

    const updates: Record<string, unknown> = {};
    for (const key of ["title", "category", "description", "basePoints", "bloodPoints", "isDynamic", "minPoints", "decayFactor", "difficulty", "visibility", "maxAttempts", "tags"] as const) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.flag) {
      updates.flagHash = hashFlag(req.body.flag);
    }

    await challenge.update(updates);
    await logAudit(req, { category: "challenges", action: "challenge.update", targetType: "challenge", targetId: challenge.id, details: { fields: Object.keys(updates) } });
    adminEvents.broadcast("challenges.refresh", { action: "updated", challengeId: challenge.id });
    res.json({ message: "Challenge updated" });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) throw notFound();
    await challenge.destroy();
    await logAudit(req, { category: "challenges", action: "challenge.delete", targetType: "challenge", targetId: challenge.id, details: { title: challenge.title } });
    adminEvents.broadcast("challenges.refresh", { action: "deleted", challengeId: challenge.id });
    res.json({ message: "Challenge deleted" });
  })
);

function handleUpload(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void {
  uploader.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        error: { code: "VALIDATION", message: `File too large — maximum size is ${config.upload.maxMb} MB` },
      });
      return;
    }
    if (err) {
      res.status(400).json({ error: { code: "VALIDATION", message: `Upload failed: ${err.message}` } });
      return;
    }
    next();
  });
}

router.post(
  "/:id/attachments",
  handleUpload,
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) {
      if (req.file) fs.unlink(path.join(config.upload.dir, req.file.filename), () => undefined);
      throw notFound();
    }
    if (!req.file) {
      throw validationError("No file provided (multipart field name: file)");
    }

    const attachments = [
      ...challenge.attachments,
      { name: req.file.originalname, filename: req.file.filename, size: req.file.size },
    ];
    await challenge.update({ attachments });
    await logAudit(req, {
      category: "challenges",
      action: "challenge.asset_upload",
      targetType: "challenge",
      targetId: challenge.id,
      details: { filename: req.file.originalname, size: req.file.size },
    });
    adminEvents.broadcast("challenges.refresh", { action: "asset_uploaded", challengeId: challenge.id });
    res.status(201).json({ message: "Asset uploaded", attachments: challenge.attachments });
  })
);

router.get(
  "/:id/attachments/:filename",
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) throw notFound();
    const attachment = challenge.attachments.find((a) => a.filename === req.params.filename);
    if (!attachment) throw notFound();

    const filePath = path.resolve(config.upload.dir, attachment.filename);
    const root = path.resolve(config.upload.dir);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath)) throw notFound();

    res.download(filePath, attachment.name, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment missing" } });
      }
    });
  })
);

router.delete(
  "/:id/attachments/:filename",
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) throw notFound();
    const attachment = challenge.attachments.find((a) => a.filename === req.params.filename);
    if (!attachment) throw notFound();

    await challenge.update({ attachments: challenge.attachments.filter((a) => a.filename !== req.params.filename) });
    fs.unlink(path.join(config.upload.dir, attachment.filename), () => undefined);
    await logAudit(req, {
      category: "challenges",
      action: "challenge.asset_delete",
      targetType: "challenge",
      targetId: challenge.id,
      details: { filename: attachment.name },
    });
    adminEvents.broadcast("challenges.refresh", { action: "asset_deleted", challengeId: challenge.id });
    res.json({ message: "Asset removed", attachments: challenge.attachments });
  })
);

const visibilitySchema = Joi.object({
  visibility: Joi.string().valid("draft", "hidden", "live").required(),
});

router.post(
  "/:id/visibility",
  validate(visibilitySchema),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) throw notFound();
    await challenge.update({ visibility: req.body.visibility as ChallengeVisibility });
    await logAudit(req, { category: "challenges", action: "challenge.visibility", targetType: "challenge", targetId: challenge.id, details: { visibility: req.body.visibility } });
    adminEvents.broadcast("challenges.refresh", { action: "visibility", challengeId: challenge.id });
    res.json({ message: `Challenge visibility set to ${req.body.visibility}` });
  })
);

const hintSchema = Joi.object({
  content: Joi.string().trim().min(1).max(10_000).required(),
  cost: Joi.number().integer().min(0).max(100_000).default(0),
});

router.post(
  "/:id/hints",
  validate(hintSchema),
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) throw notFound();
    const hints = await Hint.findAll({ where: { challengeId: challenge.id } });
    const hint = await Hint.create({
      challengeId: challenge.id,
      content: req.body.content,
      cost: req.body.cost ?? 0,
      order: hints.length,
    });
    await logAudit(req, { category: "challenges", action: "hint.create", targetType: "hint", targetId: hint.id, details: { challengeId: challenge.id } });
    res.status(201).json({ message: "Hint added", hint });
  })
);

router.patch(
  "/hints/:hintId",
  validate(hintSchema),
  asyncHandler(async (req, res) => {
    const hint = await Hint.findByPk(req.params.hintId);
    if (!hint) throw notFound();
    await hint.update({ content: req.body.content, cost: req.body.cost ?? hint.cost });
    await logAudit(req, { category: "challenges", action: "hint.update", targetType: "hint", targetId: hint.id });
    res.json({ message: "Hint updated" });
  })
);

router.delete(
  "/hints/:hintId",
  asyncHandler(async (req, res) => {
    const hint = await Hint.findByPk(req.params.hintId);
    if (!hint) throw notFound();
    await hint.destroy();
    await logAudit(req, { category: "challenges", action: "hint.delete", targetType: "hint", targetId: hint.id });
    res.json({ message: "Hint deleted" });
  })
);

router.get(
  "/:id/stats",
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) throw notFound();

    const attempts = await Submission.count({ where: { challengeId: challenge.id } });
    const solves = await Submission.count({ where: { challengeId: challenge.id, isCorrect: true } });
    const recent = await Submission.findAll({
      where: { challengeId: challenge.id },
      include: [{ model: User, as: "user", attributes: ["id", "username"] }],
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    res.json({
      challengeId: challenge.id,
      attempts,
      solves,
      successRate: attempts ? Math.round((solves / attempts) * 1000) / 10 : 0,
      firstBlood: recent.find((s) => s.isCorrect) ?? null,
      recent: recent.map((s) => ({
        id: s.id,
        username: s.user?.username ?? "unknown",
        isCorrect: s.isCorrect,
        pointsAwarded: s.pointsAwarded,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  })
);

export default router;
