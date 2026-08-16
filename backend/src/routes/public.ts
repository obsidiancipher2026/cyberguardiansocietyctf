import { Router } from "express";
import { Sequelize } from "sequelize";
import { Challenge, Submission, User } from "../models";
import { getCompetitionState } from "../services/competition";
import { asyncHandler } from "../utils/errors";

const router = Router();

router.get(
  "/competition",
  asyncHandler(async (_req, res) => {
    res.json(await getCompetitionState());
  })
);

// Aggregate, non-sensitive statistics for decorative public panels
// (login/register hero). No per-user or per-challenge detail is exposed.
router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [challenges, operatives] = await Promise.all([
      Challenge.count({ where: { visibility: "live" } }),
      User.count({ where: { isApproved: true, isBanned: false } }),
    ]);

    const topRows = (await Submission.findAll({
      attributes: [
        "userId",
        [Sequelize.fn("COUNT", Sequelize.col("Submission.id")), "solves"],
        [Sequelize.fn("SUM", Sequelize.col("pointsAwarded")), "points"],
      ],
      where: { isCorrect: true },
      group: ["userId"],
      raw: true,
    })) as unknown as Array<{ userId: number; solves: string; points: string | null }>;

    let topOperative: { name: string; points: number; solves: number } | null = null;
    if (topRows.length > 0) {
      const top = topRows.sort(
        (a, b) => Number(b.points ?? 0) - Number(a.points ?? 0)
      )[0];
      const u = await User.findByPk(top.userId, { attributes: ["username"] });
      topOperative = {
        name: u?.username ?? "unknown",
        points: Number(top.points ?? 0),
        solves: Number(top.solves),
      };
    }

    res.json({ challenges, operatives, topOperative });
  })
);

export default router;
