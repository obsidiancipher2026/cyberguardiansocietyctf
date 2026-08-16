import { Router } from "express";
import { Op, Sequelize } from "sequelize";
import { Team, User, Submission, Challenge } from "../models";
import { getCompetitionState } from "../services/competition";
import { asyncHandler } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import type { ScoreboardEntry } from "@cgs-ctf/shared";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const mode = req.query.mode === "individual" ? "individual" : "team";
    const state = await getCompetitionState();
    const frozen = state.scoreboardFrozen || state.status === "frozen" || state.status === "ended";

    // A frozen scoreboard must be a real snapshot: every score below is
    // computed from submissions recorded at or before the freeze instant.
    const freezeAt: Date | null =
      frozen && state.scoreboardFrozenAt
        ? new Date(state.scoreboardFrozenAt)
        : frozen
          ? new Date()
          : null;
    const submissionScope = freezeAt ? { createdAt: { [Op.lte]: freezeAt } } : {};

    if (mode === "team") {
      const teams = await Team.findAll({ order: [["points", "DESC"], ["updatedAt", "ASC"]] });
      const entries: ScoreboardEntry[] = teams.map((t, i) => ({
        rank: i + 1,
        name: t.name,
        teamId: t.id,
        points: 0,
        solves: 0,
        lastSolveAt: null,
      }));

      const counts = await Submission.findAll({
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.col("Submission.id")), "solves"],
          [Sequelize.fn("SUM", Sequelize.col("pointsAwarded")), "points"],
          [Sequelize.fn("MAX", Sequelize.col("Submission.createdAt")), "lastSolveAt"],
        ],
        where: { isCorrect: true, ...submissionScope },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["teamId"],
            where: { teamId: { [Op.ne]: null } },
          },
        ],
        group: ["user.teamId"],
        raw: true,
      }) as unknown as Array<{ "user.teamId": number; solves: string; points: string | null; lastSolveAt: string }>;

      const byTeam = new Map<number, { solves: number; points: number; lastSolveAt: string }>();
      for (const c of counts) {
        byTeam.set(c["user.teamId"], {
          solves: Number(c.solves),
          points: Number(c.points ?? 0),
          lastSolveAt: c.lastSolveAt,
        });
      }
      const teamPoints = new Map(teams.map((t) => [t.id, t.points]));
      for (const e of entries) {
        const info = byTeam.get(e.teamId!);
        if (info) {
          e.solves = info.solves;
          e.lastSolveAt = info.lastSolveAt;
        }
        // Frozen boards rank by the snapshot total (SUM of submissions up to
        // the freeze instant); live boards use the maintained team-points
        // counter (which also reflects hint spends).
        e.points = frozen ? byTeam.get(e.teamId!)?.points ?? 0 : teamPoints.get(e.teamId!) ?? 0;
      }
      entries.sort((a, b) => b.points - a.points || (a.lastSolveAt ?? "").localeCompare(b.lastSolveAt ?? ""));
      entries.forEach((e, i) => (e.rank = i + 1));
      return res.json({ mode, frozen, entries });
    }

    const users = await User.findAll({
      attributes: ["id", "username", "teamId", "createdAt"],
      where: { role: { [Op.ne]: "admin" } },
      order: [["createdAt", "ASC"]],
    });
    const entries: Array<ScoreboardEntry & { id: number }> = users.map((u) => ({
      id: u.id,
      rank: 0,
      name: u.username,
      teamId: u.teamId,
      points: 0,
      solves: 0,
      lastSolveAt: null,
    }));

    const counts = await Submission.findAll({
      attributes: [
        [Sequelize.col("Submission.userId"), "userId"],
        [Sequelize.fn("COUNT", Sequelize.col("Submission.id")), "solves"],
        [Sequelize.fn("SUM", Sequelize.col("pointsAwarded")), "points"],
        [Sequelize.fn("MAX", Sequelize.col("Submission.createdAt")), "lastSolveAt"],
      ],
      where: { isCorrect: true, ...submissionScope },
      group: ["userId"],
      raw: true,
    }) as unknown as Array<{ userId: number; solves: string; points: string | null; lastSolveAt: string }>;

    const byUser = new Map<number, { solves: number; points: number; lastSolveAt: string }>();
    for (const c of counts) {
      byUser.set(c.userId, { solves: Number(c.solves), points: Number(c.points ?? 0), lastSolveAt: c.lastSolveAt });
    }
    // Only operatives with at least one verified capture rank on the board —
    // registered-but-silent accounts (and leftover test users) never appear.
    const ranked = entries.filter((e) => (byUser.get(e.id)?.solves ?? 0) > 0);
    for (const e of ranked) {
      const info = byUser.get(e.id);
      if (info) {
        e.points = info.points;
        e.solves = info.solves;
        e.lastSolveAt = info.lastSolveAt;
      }
    }

    ranked.sort((a, b) => b.points - a.points || (a.lastSolveAt ?? "").localeCompare(b.lastSolveAt ?? ""));
    ranked.forEach((e, i) => (e.rank = i + 1));

    res.json({ mode, frozen, entries: ranked });
  })
);

router.get(
  "/timeline",
  requireAuth,
  asyncHandler(async (req, res) => {
    const top = await Submission.findAll({
      where: { isCorrect: true },
      order: [["createdAt", "DESC"]],
      limit: 20,
      include: [
        { model: User, as: "user", attributes: ["username", "teamId"] },
        { model: Challenge, as: "challenge", attributes: ["title", "category"] },
      ],
    });
    res.json({
      events: top.map((s) => ({
        id: s.id,
        username: s.user?.username ?? "unknown",
        challenge: s.challenge?.title ?? "unknown",
        category: s.challenge?.category ?? "misc",
        points: s.pointsAwarded,
        at: s.createdAt.toISOString(),
      })),
    });
  })
);

export default router;
