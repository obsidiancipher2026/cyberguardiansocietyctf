import { Router } from "express";
import { Op } from "sequelize";
import { Announcement, User } from "../models";
import { asyncHandler } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import type { AnnouncementPublic } from "@cgs-ctf/shared";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const user = req.user!;

    // Enforce the audience field: team members see "all" + "teams",
    // individual players see "all" + "individuals". Legacy rows with a NULL
    // audience are treated as "all".
    const audienceFilter = {
      [Op.or]: [
        { [Op.in]: user.teamId != null ? ["all", "teams"] : ["all", "individuals"] },
        { [Op.is]: null },
      ],
    };

    const rows = await Announcement.findAll({
      where: {
        publishedAt: { [Op.ne]: null },
        publishAt: { [Op.or]: [{ [Op.lte]: now }, { [Op.is]: null }] },
        audience: audienceFilter,
      },
      order: [["isPinned", "DESC"], ["publishedAt", "DESC"]],
      include: [{ model: User, as: "author", attributes: ["username"] }],
    });

    const items: AnnouncementPublic[] = rows.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      isPinned: a.isPinned,
      author: a.author?.username ?? "CGS CTF Staff",
      publishedAt: (a.publishedAt ?? a.publishAt ?? a.createdAt).toISOString(),
    }));

    res.json({ announcements: items });
  })
);

export default router;
