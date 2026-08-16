import { Router } from "express";
import Joi from "joi";
import { Op, type WhereOptions } from "sequelize";
import { Announcement } from "../../models";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler, notFound } from "../../utils/errors";
import { logAudit } from "../../services/adminAudit";
import { hub } from "../../services/realtime";
import { likePattern } from "../../utils/search";

const router = Router();
router.use(requireAdmin);

function qp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

const listSchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(1000),
  audience: Joi.string().valid("all", "teams", "individuals"),
  status: Joi.string().valid("published", "scheduled", "draft"),
  search: Joi.string().trim().max(255).allow(""),
});

router.get(
  "/",
  validate(listSchema),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(qp(req.query.limit) ?? "20", 10) || 20));
    const audience = qp(req.query.audience);
    const status = qp(req.query.status);
    const search = qp(req.query.search);

    const where: WhereOptions = {};
    if (audience) where.audience = audience;
    if (search) Object.assign(where, { [Op.or]: [{ title: { [Op.like]: likePattern(search) } }, { content: { [Op.like]: likePattern(search) } }] });
    if (status === "published") where.publishedAt = { [Op.ne]: null };
    if (status === "scheduled") where.publishedAt = null;
    if (status === "draft") where.publishedAt = null;

    const { rows, count } = await Announcement.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });

    res.json({
      total: count,
      page,
      limit,
      announcements: rows.map((a) => ({
        id: a.id,
        title: a.title,
        isPinned: a.isPinned,
        publishAt: a.publishAt,
        publishedAt: a.publishedAt,
        audience: a.audience,
        pushEnabled: a.pushEnabled,
        contentPreview: a.content.slice(0, 140),
        createdAt: a.createdAt.toISOString(),
      })),
    });
  })
);

const announcementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  content: Joi.string().trim().min(1).max(20_000).required(),
  isPinned: Joi.boolean().default(false),
  audience: Joi.string().valid("all", "teams", "individuals").default("all"),
  pushEnabled: Joi.boolean().default(false),
  publishAt: Joi.date().iso().optional().allow(null),
});

router.post(
  "/",
  validate(announcementSchema),
  asyncHandler(async (req, res) => {
    const { title, content, isPinned, audience, pushEnabled, publishAt } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      isPinned: isPinned ?? false,
      audience: audience ?? "all",
      pushEnabled: pushEnabled ?? false,
      publishAt: publishAt ?? null,
      publishedAt: publishAt ? null : new Date(),
      createdBy: req.admin!.id,
    });
    await logAudit(req, { category: "announcements", action: "announcement.create", targetType: "announcement", targetId: announcement.id, details: { title } });
    if (announcement.publishedAt) {
      hub.broadcast("announcement", { id: announcement.id, title: announcement.title, at: announcement.publishedAt });
    }
    res.status(201).json({ message: "Announcement created", id: announcement.id, published: Boolean(announcement.publishedAt) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) throw notFound();
    res.json({ announcement });
  })
);

const patchSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255),
  content: Joi.string().trim().min(1).max(20_000),
  isPinned: Joi.boolean(),
  audience: Joi.string().valid("all", "teams", "individuals"),
  pushEnabled: Joi.boolean(),
  publishAt: Joi.date().iso().allow(null),
  publishedAt: Joi.date().iso().allow(null),
});

router.patch(
  "/:id",
  validate(patchSchema),
  asyncHandler(async (req, res) => {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) throw notFound();

    const updates: Record<string, unknown> = {};
    for (const key of ["title", "content", "isPinned", "audience", "pushEnabled", "publishedAt"] as const) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.publishAt !== undefined) updates.publishAt = req.body.publishAt;

    await announcement.update(updates);
    await logAudit(req, { category: "announcements", action: "announcement.update", targetType: "announcement", targetId: announcement.id });
    res.json({ message: "Announcement updated" });
  })
);

router.post(
  "/:id/publish",
  asyncHandler(async (req, res) => {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) throw notFound();
    if (!announcement.publishedAt) {
      await announcement.update({ publishedAt: new Date() });
    }
    hub.broadcast("announcement", { id: announcement.id, title: announcement.title, at: announcement.publishedAt });
    await logAudit(req, { category: "announcements", action: "announcement.publish", targetType: "announcement", targetId: announcement.id });
    res.json({ message: "Announcement published" });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) throw notFound();
    await announcement.destroy();
    await logAudit(req, { category: "announcements", action: "announcement.delete", targetType: "announcement", targetId: announcement.id });
    res.json({ message: "Announcement deleted" });
  })
);

export default router;
