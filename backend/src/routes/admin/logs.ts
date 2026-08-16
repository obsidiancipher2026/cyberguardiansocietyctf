import { Router } from "express";
import fs from "fs";
import path from "path";
import Joi from "joi";
import { Op } from "sequelize";
import { config } from "../../config";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, notFound } from "../../utils/errors";
import { ActivityLog, User } from "../../models";
import { logAudit } from "../../services/adminAudit";
import { adminEvents } from "../../services/adminEvents";
import { likePattern } from "../../utils/search";

const router = Router();
router.use(requireAdmin);

function logDir(): string {
  return path.resolve(config.logDir);
}

router.get("/", asyncHandler(async (_req, res) => {
  const dir = logDir();
  let files: { name: string; size: number; mtime: string }[] = [];
  try {
    const entries = await fs.promises.readdir(dir);
    files = (
      await Promise.all(
        entries.map(async (name) => {
          try {
            const stat = await fs.promises.stat(path.join(dir, name));
            if (!stat.isFile()) return null;
            return { name, size: stat.size, mtime: stat.mtime.toISOString() };
          } catch {
            return null;
          }
        })
      )
    ).filter((f): f is { name: string; size: number; mtime: string } => f !== null);
  } catch {
    files = [];
  }
  files.sort((a, b) => b.mtime.localeCompare(a.mtime));
  res.json({ files });
}));

const readSchema = Joi.object({
  file: Joi.string().trim().min(1).max(255).required(),
  lines: Joi.number().integer().min(1).max(5000),
  filter: Joi.string().trim().max(255).allow(""),
});

router.get("/read", validate(readSchema), asyncHandler(async (req, res) => {
  const fileName = path.basename(req.query.file as string);
  const lines = Math.max(1, Math.min(5000, parseInt(String(req.query.lines ?? "500"), 10) || 500));
  const filter = typeof req.query.filter === "string" ? req.query.filter.trim() : "";

  const fullPath = path.join(logDir(), fileName);
  if (!fullPath.startsWith(logDir()) || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw notFound();
  }

  // Read only the tail of the file (bounded byte window) so a multi-MB daily
  // log cannot be slurped into memory on every request. 64 KiB comfortably
  // covers the default 500-line tail of typical log lines.
  const MAX_TAIL_BYTES = 64 * 1024;
  const fd = await fs.promises.open(fullPath, "r");
  let content: string;
  try {
    const stat = await fd.stat();
    const start = Math.max(0, stat.size - MAX_TAIL_BYTES);
    const buffer = Buffer.alloc(stat.size - start);
    await fd.read(buffer, 0, buffer.length, start);
    content = buffer.toString("utf8");
  } finally {
    await fd.close();
  }
  let linesArr = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (filter) {
    linesArr = linesArr.filter((l) => l.toLowerCase().includes(filter.toLowerCase()));
  }
  const tail = linesArr.slice(-lines);

  res.json({
    file: fileName,
    totalLines: linesArr.length,
    returnedLines: tail.length,
    filter: filter || null,
    lines: tail,
  });
}));

const activityQuerySchema = Joi.object({
  category: Joi.string().trim().max(32).allow(""),
  action: Joi.string().trim().max(128).allow(""),
  ip: Joi.string().trim().max(64).allow(""),
  from: Joi.date().iso().allow(""),
  to: Joi.date().iso().allow(""),
});

router.get("/activity", validate(activityQuerySchema), asyncHandler(async (req, res) => {
  const where: Record<string, unknown> = {};
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
  const ip = typeof req.query.ip === "string" ? req.query.ip.trim() : "";
  const from = typeof req.query.from === "string" && req.query.from ? req.query.from : "";
  const to = typeof req.query.to === "string" && req.query.to ? req.query.to : "";

  if (category) where.category = category;
  if (action) where.action = { [Op.like]: likePattern(action) };
  if (ip) where.ipAddress = ip;
  if (from || to) {
    where.createdAt = {
      ...(from ? { [Op.gte]: new Date(from) } : {}),
      ...(to ? { [Op.lte]: new Date(to) } : {}),
    };
  }

  const rows = await ActivityLog.findAll({
    where,
    order: [["createdAt", "DESC"]],
    include: [{ model: User, as: "user", attributes: ["id", "username"] }],
  });

  res.json({
    total: rows.length,
    logs: rows.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
      user: (l as unknown as { user?: User }).user ?? null,
    })),
  });
}));

router.get("/categories", asyncHandler(async (_req, res) => {
  const rows = await ActivityLog.findAll({ attributes: ["category"], raw: true, group: ["category"], order: [["category", "ASC"]] });
  res.json({ categories: rows.map((r) => r.category) });
}));

router.delete("/activity", asyncHandler(async (req, res) => {
  const deleted = await ActivityLog.destroy({ where: {} });
  await logAudit(req, { category: "logs", action: "logs.wipe_activity", details: { deleted } });
  adminEvents.broadcast("danger", { action: "logs.wipe_activity", deleted });
  res.json({ message: `Wiped ${deleted} activity log entries`, deleted });
}));

router.get("/stream/updates", asyncHandler(async (_req, res) => {
  res.json({ streaming: false, message: "Use polling: GET /api/admin/logs/read?file=...&lines=500 or GET /api/admin/logs/activity" });
}));

export default router;