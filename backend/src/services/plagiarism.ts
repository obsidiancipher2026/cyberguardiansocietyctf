import { Op } from "sequelize";
import { Submission, User, Team, Challenge } from "../models";

export interface PlagiarismCase {
  id: string;
  flagHash: string;
  challengeId: number;
  challengeTitle: string;
  teams: string[];
  users: { id: number; username: string; teamId: number | null }[];
  submissions: { id: number; userId: number; createdAt: string }[];
  firstSeen: string;
  lastSeen: string;
  count: number;
  isCorrect: boolean;
}

interface RawSub {
  id: number;
  userId: number;
  challengeId: number;
  isCorrect: boolean;
  flagHash: string | null;
  createdAt: Date | string;
  user?: { id: number; username: string; teamId: number | null; team?: { id: number; name: string } | null } | null;
  challenge?: { id: number; title: string } | null;
}

/**
 * Plagiarism detection over real submission data.
 *
 * Flags when the same flag (identified by its hash) is submitted by users
 * belonging to DIFFERENT teams. Identical wrong guesses across teams are a
 * strong signal of shared answers / collusion; identical correct solves are
 * expected (everyone solves the same challenges) so those are excluded.
 * Returns distinct clusters grouped by (challenge, flagHash, correct state).
 */
export async function scanPlagiarism(opts: { sinceHours?: number; minTeams?: number } = {}): Promise<PlagiarismCase[]> {
  const sinceHours = opts.sinceHours ?? 48;
  const minTeams = opts.minTeams ?? 2;
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const rows = (await Submission.findAll({
    where: { createdAt: { [Op.gte]: since }, flagHash: { [Op.ne]: null } },
    include: [
      { model: User, as: "user", attributes: ["id", "username", "teamId"], include: [{ model: Team, as: "team", attributes: ["id", "name"] }] },
      { model: Challenge, as: "challenge", attributes: ["id", "title"] },
    ],
    order: [["createdAt", "ASC"]],
    raw: true,
    nest: true,
  })) as unknown as RawSub[];

  const clusters = new Map<string, RawSub[]>();
  for (const row of rows) {
    if (!row.flagHash || !row.challengeId) continue;
    const key = `${row.challengeId}|${row.isCorrect ? "correct" : "incorrect"}|${row.flagHash}`;
    const list = clusters.get(key) ?? [];
    list.push(row);
    clusters.set(key, list);
  }

  const cases: PlagiarismCase[] = [];
  for (const [key, list] of clusters) {
    if (list.length < 2) continue;
    const teamSet = new Map<number, string>();
    for (const s of list) {
      const t = s.user?.team ?? null;
      if (t) teamSet.set(t.id, t.name);
    }
    const distinctTeams = [...teamSet.values()];
    if (distinctTeams.length < minTeams) continue;

    const users = list.map((s) => ({ id: s.userId, username: s.user?.username ?? `#${s.userId}`, teamId: s.user?.teamId ?? null }));
    cases.push({
      id: key,
      flagHash: list[0].flagHash!,
      challengeId: list[0].challengeId,
      challengeTitle: list[0].challenge?.title ?? `#${list[0].challengeId}`,
      teams: distinctTeams,
      users,
      submissions: list.map((s) => ({ id: s.id, userId: s.userId, createdAt: new Date(s.createdAt).toISOString() })),
      firstSeen: new Date(list[0].createdAt).toISOString(),
      lastSeen: new Date(list[list.length - 1].createdAt).toISOString(),
      count: list.length,
      isCorrect: list[0].isCorrect,
    });
  }

  return cases.sort((a, b) => b.count - a.count);
}
