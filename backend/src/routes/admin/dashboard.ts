import { Router } from "express";
import { Op, fn, col } from "sequelize";
import { User, Team, Challenge, Submission, Announcement, Competition, AdminAuditLog, AdminLoginAttempt, AdminSession } from "../../models";
import { requireAdmin } from "../../middleware/adminAuth";
import { asyncHandler } from "../../utils/errors";

const router = Router();
router.use(requireAdmin);

function qp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [users, teams, challenges, submissions, announcements, sessions, competition] = await Promise.all([
      User.findAndCountAll(),
      Team.count(),
      Challenge.findAndCountAll(),
      Submission.findAndCountAll(),
      Announcement.findAndCountAll(),
      AdminSession.count({ where: { revoked: false } }),
      Competition.findOne({ order: [["id", "DESC"]] }),
    ]);

    const [verified, banned, pendingApprovals, admins, liveChallenges, draftChallenges, hiddenChallenges, correctSubs, publishedAnnouncements] =
      await Promise.all([
        User.count({ where: { isVerified: true } }),
        User.count({ where: { isBanned: true } }),
        User.count({ where: { isApproved: false } }),
        User.count({ where: { role: "admin" } }),
        Challenge.count({ where: { visibility: "live" } }),
        Challenge.count({ where: { visibility: "draft" } }),
        Challenge.count({ where: { visibility: "hidden" } }),
        Submission.count({ where: { isCorrect: true } }),
        Announcement.count({ where: { publishedAt: { [Op.ne]: null } } }),
      ]);

    const [solvesTotal, perCategory, recentSubmissions, recentUsers, recentAudit] = await Promise.all([
      Challenge.sum("solveCount"),
      Challenge.findAll({
        attributes: ["category", [fn("SUM", col("solveCount")), "solves"]],
        group: ["category"],
        raw: true,
      }),
      Submission.findAll({
        include: [
          { model: User, as: "user", attributes: ["id", "username"] },
          { model: Challenge, as: "challenge", attributes: ["id", "title", "category"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
      }),
      User.findAll({ order: [["createdAt", "DESC"]], limit: 10 }),
      AdminAuditLog.findAll({ order: [["createdAt", "DESC"]], limit: 10 }),
    ]);

    const last14 = await Submission.findAll({
      attributes: ["createdAt", "isCorrect"],
      where: { createdAt: { [Op.gte]: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      raw: true,
    });
    const dayCounts = new Map<string, { total: number; correct: number }>();
    for (const row of last14) {
      const day = new Date(row.createdAt).toISOString().slice(0, 10);
      const entry = dayCounts.get(day) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (row.isCorrect) entry.correct += 1;
      dayCounts.set(day, entry);
    }
    const perDay = [...dayCounts.entries()]
      .map(([day, v]) => ({ day, total: v.total, correct: v.correct }))
      .sort((a, b) => a.day.localeCompare(b.day));

    res.json({
      totals: {
        users: users.count,
        teams,
        challenges: challenges.count,
        submissions: submissions.count,
        announcements: announcements.count,
        activeAdminSessions: sessions,
      },
      breakdown: {
        verified,
        banned,
        pendingApprovals,
        admins,
        liveChallenges,
        draftChallenges,
        hiddenChallenges,
        correctSubmissions: correctSubs,
        solvedChallenges: solvesTotal ?? 0,
        publishedAnnouncements,
      },
      perCategory: perCategory.map((r) => ({
        category: r.category,
        solves: Number((r as unknown as { solves: string | number }).solves) || 0,
      })),
      perDay,
      recent: {
        submissions: recentSubmissions.map((s) => ({
          id: s.id,
          username: s.user?.username ?? "unknown",
          challenge: s.challenge?.title ?? `#${s.challengeId}`,
          category: s.challenge?.category ?? null,
          isCorrect: s.isCorrect,
          createdAt: s.createdAt.toISOString(),
        })),
        users: recentUsers.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        })),
        audit: recentAudit.map((a) => ({
          id: a.id,
          action: a.action,
          category: a.category,
          createdAt: a.createdAt.toISOString(),
        })),
      },
      competition: {
        status: competition?.status ?? "upcoming",
        maintenanceMode: competition?.maintenanceMode ?? false,
        submissionsKilled: competition?.submissionsKilled ?? false,
        scoreboardFrozen: competition?.scoreboardFrozen ?? false,
      },
    });
  })
);

router.get(
  "/activity",
  asyncHandler(async (_req, res) => {
    const [failedLogins, recentLogins, auditToday] = await Promise.all([
      AdminLoginAttempt.count({ where: { success: false, createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      AdminLoginAttempt.findAll({ where: { success: true, createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, order: [["createdAt", "DESC"]], limit: 20 }),
      AdminAuditLog.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);
    res.json({
      failedLogins24h: failedLogins,
      auditActions24h: auditToday,
      recentAdminLogins: recentLogins.map((a) => ({
        id: a.id,
        identifier: a.identifier,
        ipAddress: a.ipAddress,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  })
);

router.get(
  "/progress",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(qp(req.query.page) ?? "1", 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(qp(req.query.limit) ?? "25", 10) || 25));

    const [solvesAgg, attemptsAgg, allUsers] = await Promise.all([
      Submission.findAll({
        attributes: ["userId", [fn("SUM", col("pointsAwarded")), "points"], [fn("COUNT", col("id")), "solves"]],
        where: { isCorrect: true },
        group: ["userId"],
        raw: true,
      }),
      Submission.count({ group: ["userId"] }),
      User.findAll({ attributes: ["id"] }),
    ]);

    const pointsMap = new Map<number, number>();
    const solvesMap = new Map<number, number>();
    for (const row of solvesAgg as unknown as { userId: number; points: string | number; solves: string | number }[]) {
      pointsMap.set(row.userId, Number(row.points) || 0);
      solvesMap.set(row.userId, Number(row.solves) || 0);
    }
    const attemptsMap = new Map<number, number>();
    for (const row of attemptsAgg as unknown as { userId: number; count: number }[]) {
      attemptsMap.set(row.userId, row.count);
    }

    // First-blood ("blood points") — sum of the configured first-blood bonus
    // awarded on the earliest correct submission of each challenge, attributed
    // to the user who drew first blood.
    const correctSubs = (await Submission.findAll({
      where: { isCorrect: true },
      attributes: ["challengeId", "userId", "bloodPointsAwarded", "createdAt"],
      order: [["createdAt", "ASC"]],
      raw: true,
    })) as unknown as { challengeId: number; userId: number; bloodPointsAwarded: number | string }[];

    const firstBloodByChallenge = new Map<number, number>();
    for (const s of correctSubs) {
      if (!firstBloodByChallenge.has(s.challengeId)) firstBloodByChallenge.set(s.challengeId, s.userId);
    }
    const bloodMap = new Map<number, number>();
    for (const s of correctSubs) {
      const fb = firstBloodByChallenge.get(s.challengeId);
      if (fb === s.userId) bloodMap.set(fb, (bloodMap.get(fb) ?? 0) + Number(s.bloodPointsAwarded || 0));
    }

    const total = allUsers.length;
    const rankedIds = allUsers
      .map((u) => u.id)
      .sort((a, b) => (pointsMap.get(b) ?? 0) - (pointsMap.get(a) ?? 0) || a - b);

    const ids = rankedIds.slice((page - 1) * limit, (page - 1) * limit + limit);
    const users = await User.findAll({ where: { id: { [Op.in]: ids } } });
    const byId = new Map(users.map((u) => [u.id, u]));

    res.json({
      total,
      page,
      limit,
      entries: ids.map((id, i) => {
        const u = byId.get(id)!;
        const points = pointsMap.get(id) ?? 0;
        const solves = solvesMap.get(id) ?? 0;
        const attempts = attemptsMap.get(id) ?? 0;
        return {
          rank: (page - 1) * limit + i + 1,
          id: u.id,
          username: u.username,
          email: u.email,
          university: u.university,
          country: u.country,
          role: u.role,
          isApproved: u.isApproved,
          isBanned: u.isBanned,
          points,
          solves,
          attempts,
          accuracy: attempts ? Math.round((solves / attempts) * 1000) / 10 : 0,
          bloodPoints: bloodMap.get(id) ?? 0,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt.toISOString(),
        };
      }),
    });
  })
);

export default router;
