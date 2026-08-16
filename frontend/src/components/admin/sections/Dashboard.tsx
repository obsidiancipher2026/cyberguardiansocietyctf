"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Target,
  Activity,
  Trophy,
  UserCheck,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { connectAdminEvents } from "@/lib/adminRealtime";
import {
  BadgePill,
  Btn,
  Card,
  EmptyState,
  ErrorState,
  StatCard,
  Spinner,
  TableWrap,
  Td,
  fmtDate,
} from "../ui";

type Stats = {
  totals: {
    users: number;
    teams: number;
    challenges: number;
    submissions: number;
    announcements: number;
    activeAdminSessions: number;
  };
  breakdown: {
    verified: number;
    banned: number;
    pendingApprovals: number;
    admins: number;
    liveChallenges: number;
    draftChallenges: number;
    hiddenChallenges: number;
    correctSubmissions: number;
    solvedChallenges: number;
    publishedAnnouncements: number;
  };
  perCategory: { category: string; solves: number }[];
  perDay: { day: string; total: number; correct: number }[];
  recent: {
    submissions: { id: number; username: string; challenge: string; category: string | null; isCorrect: boolean; createdAt: string }[];
    users: { id: number; username: string; email: string; role: string; createdAt: string }[];
    audit: { id: number; action: string; category: string; createdAt: string }[];
  };
  competition: {
    status: string;
    maintenanceMode: boolean;
    submissionsKilled: boolean;
    scoreboardFrozen: boolean;
  };
};

type ProgressEntry = {
  rank: number;
  id: number;
  username: string;
  email: string;
  university: string | null;
  country: string | null;
  role: string;
  isApproved: boolean;
  isBanned: boolean;
  points: number;
  solves: number;
  attempts: number;
  accuracy: number;
  bloodPoints: number;
  lastLoginAt: string | null;
  createdAt: string;
};

type ProgressData = {
  total: number;
  page: number;
  limit: number;
  entries: ProgressEntry[];
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = () => {
    adminApi
      .get<Stats>("/admin/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message));
    adminApi
      .get<ProgressData>("/admin/dashboard/progress?limit=1000")
      .then((res) => setProgress(res.data))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Live: platform events (submissions, users, challenges, danger actions)
  // refresh the telemetry immediately.
  useEffect(() => {
    const off = connectAdminEvents((event) => {
      if (["submission", "users.refresh", "challenges.refresh", "danger"].includes(event)) loadAll();
    });
    return off;
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <Spinner label="Gathering telemetry" />;

  const accuracy = stats.totals.submissions
    ? Math.round((stats.breakdown.correctSubmissions / stats.totals.submissions) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Users" value={stats.totals.users} sub={`${stats.breakdown.verified} verified · ${stats.breakdown.banned} banned · ${stats.breakdown.admins} admins`} icon={Users} />
        <StatCard label="Pending approvals" value={stats.breakdown.pendingApprovals} sub="Registrations awaiting admin action" icon={UserCheck} tone={stats.breakdown.pendingApprovals > 0 ? "warning" : "success"} />
        <StatCard label="Teams" value={stats.totals.teams} icon={Users} tone="secondary" />
        <StatCard label="Challenges" value={stats.totals.challenges} sub={`${stats.breakdown.liveChallenges} live · ${stats.breakdown.draftChallenges} draft · ${stats.breakdown.hiddenChallenges} hidden`} icon={Target} />
        <StatCard label="Submissions" value={stats.totals.submissions} sub={`${stats.breakdown.correctSubmissions} correct (${accuracy}%)`} icon={Activity} tone="secondary" />
        <StatCard label="Solves" value={stats.breakdown.solvedChallenges} icon={Trophy} tone="success" />
      </div>

      {/* ── Submission activity ───────────────────────────────── */}
      {stats.perDay.length > 0 && (
        <Card title="Submission Activity" subtitle="Last 14 days — attempts vs correct" bodyClassName="p-5">
            <div className="flex items-end gap-1 h-36">
              {stats.perDay.map((d) => {
                const max = Math.max(...stats.perDay.map((x) => x.total), 1);
                const h = Math.max(5, Math.round((d.total / max) * 120));
                const hc = Math.max(2, Math.round((d.correct / max) * 120));
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0 group" title={`${d.day}: ${d.total} attempts (${d.correct} correct)`}>
                    <div className="w-full flex items-end justify-center gap-0.5">
                      <div
                        className="w-1/2 rounded-t-md bg-gradient-to-t from-primary/70 to-primary/30 transition-all duration-300 group-hover:brightness-125"
                        style={{ height: h }}
                      />
                      <div
                        className="w-1/2 rounded-t-md bg-gradient-to-t from-secondary/80 to-secondary/30 transition-all duration-300 group-hover:brightness-125"
                        style={{ height: hc }}
                      />
                    </div>
                    <span className="text-[8px] text-muted/70 truncate w-full text-center">{d.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-5 mt-4 pt-3 border-t border-white/5">
              <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-muted">
                <i className="w-2 h-2 rounded-full bg-primary/70" /> Attempts
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-muted">
                <i className="w-2 h-2 rounded-full bg-secondary/80" /> Correct
              </span>
            </div>
          </Card>
        )}

      {/* ── Recent activity ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Recent Submissions" subtitle="Latest flag attempts">
          {stats.recent.submissions.length === 0 ? (
            <EmptyState title="No submissions yet" />
          ) : (
            <TableWrap headers={["User", "Challenge", "Result", "When"]}>
              {stats.recent.submissions.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                  <Td className="font-semibold text-white">{s.username}</Td>
                  <Td>{s.challenge}</Td>
                  <Td>
                    <BadgePill tone={s.isCorrect ? "success" : "danger"}>{s.isCorrect ? "Correct" : "Wrong"}</BadgePill>
                  </Td>
                  <Td className="text-muted">{fmtDate(s.createdAt)}</Td>
                </tr>
              ))}
            </TableWrap>
          )}
        </Card>

        <Card title="New Registrations" subtitle="Latest accounts">
          {stats.recent.users.length === 0 ? (
            <EmptyState title="No users yet" />
          ) : (
            <TableWrap headers={["Username", "Email", "Role", "Joined"]}>
              {stats.recent.users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-white/[0.02]">
                  <Td className="font-semibold text-white">{u.username}</Td>
                  <Td className="text-muted max-w-[160px] truncate">{u.email}</Td>
                  <Td>
                    <BadgePill tone={u.role === "admin" ? "danger" : "neutral"}>{u.role}</BadgePill>
                  </Td>
                  <Td className="text-muted">{fmtDate(u.createdAt)}</Td>
                </tr>
              ))}
            </TableWrap>
          )}
        </Card>
      </div>

      {/* ── Progress ──────────────────────────────────────────── */}
      <Card
        title="All Progress"
        subtitle="Every registered participant, ranked by total score"
        actions={
          <Btn size="sm" variant="outline" onClick={() => adminApi.get<ProgressData>("/admin/dashboard/progress?limit=1000").then((res) => setProgress(res.data))}>
            <Activity className="w-3.5 h-3.5" /> Refresh
          </Btn>
        }
      >
        {!progress ? (
          <Spinner label="Loading progress" />
        ) : progress.entries.length === 0 ? (
          <EmptyState title="No participants yet" />
        ) : (
          <>
            <TableWrap headers={["Participant", "Affiliation", "Status", "Points", "Solves", "BP", "Attempts", "Accuracy", "Last login"]}>
              {progress.entries.map((e) => (
                <tr key={e.id} className={`transition-colors hover:bg-white/[0.02] ${e.isBanned ? "opacity-60" : ""}`}>
                  <Td>
                    <p className="font-semibold text-white">{e.username}</p>
                    <p className="text-[10px] text-muted truncate max-w-[160px]">{e.email}</p>
                  </Td>
                  <Td className="text-muted max-w-[160px] truncate">{e.university ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {e.isApproved ? (
                        <BadgePill tone="success">approved</BadgePill>
                      ) : (
                        <BadgePill tone="warning">pending</BadgePill>
                      )}
                      {e.isBanned && <BadgePill tone="danger">banned</BadgePill>}
                    </div>
                  </Td>
                  <Td className="font-mono text-white font-bold tabular-nums">{e.points}</Td>
                  <Td className="font-mono tabular-nums">{e.solves}</Td>
                  <Td className="font-mono text-secondary font-semibold tabular-nums">{e.bloodPoints}</Td>
                  <Td className="font-mono text-muted tabular-nums">{e.attempts}</Td>
                  <Td className="font-mono text-muted tabular-nums">{e.accuracy}%</Td>
                  <Td className="text-muted">{fmtDate(e.lastLoginAt)}</Td>
                </tr>
              ))}
            </TableWrap>
          </>
        )}
      </Card>
    </div>
  );
}