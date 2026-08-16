"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  KeyRound,
  UserX,
  Gauge,
  FileSearch,
  ScrollText,
  Activity,
  BellRing,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Ban,
  Trash2,
  Radar,
  CheckCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, adminErrorMessage } from "@/lib/adminApi";
import { connectAdminEvents } from "@/lib/adminRealtime";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatedList, AnimatedListItem } from "@/registry/magicui/animated-list";
import {
  BadgePill,
  Btn,
  Card,
  ConfirmBtn,
  EmptyState,
  ErrorState,
  Pagination,
  SectionHeader,
  Spinner,
  StatCard,
  TableWrap,
  Td,
  fmtDate,
} from "../ui";

type Overview = {
  activeAdminSessions: number;
  activeUserSessions: number;
  failedLogins24h: number;
  successfulLogins24h: number;
  bannedUsers: number;
  auditActions24h: number;
  openAlerts: number;
  activeRateBlocks: number;
  trafficRps: number;
  trafficSpike: boolean;
  activeLockouts: number;
};

type Session = {
  id: number;
  type: "admin" | "user";
  label: string;
  entityId: number;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
};

type RateBlock = {
  key: string;
  reason: string;
  count: number;
  windowMs: number;
  blockedUntil: string;
};

type AuditEntry = {
  id: number;
  adminId: number | null;
  adminUsername: string;
  category: string;
  action: string;
  ipAddress: string | null;
  createdAt: string;
};

type PlagiarismCase = {
  id: string;
  flagHash: string;
  challengeId: number;
  challengeTitle: string;
  teams: string[];
  users: { id: number; username: string; teamId: number | null }[];
  count: number;
  isCorrect: boolean;
  firstSeen: string;
  lastSeen: string;
};

type AlertItem = {
  id: number;
  severity: "info" | "warning" | "critical";
  category: string;
  title: string;
  message: string | null;
  details: unknown;
  acknowledged: boolean;
  createdAt: string;
};

type Traffic = {
  total: number;
  rps: { current: number; baseline: number };
  byStatus: { status: number; count: number }[];
  topPaths: { path: string; count: number; errors: number; avgLatency: number }[];
  topIps: { ip: string; count: number }[];
  windowSeconds: number;
};

type TabKey = "sessions" | "rate" | "plagiarism" | "audit" | "traffic" | "alerts";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "sessions", label: "Sessions", icon: KeyRound },
  { key: "rate", label: "Rate Limiting", icon: Gauge },
  { key: "plagiarism", label: "Plagiarism", icon: FileSearch },
  { key: "traffic", label: "Traffic", icon: Activity },
  { key: "alerts", label: "Alerts", icon: BellRing },
  { key: "audit", label: "Audit Trail", icon: ScrollText },
];

const SEVERITY_TONE = { info: "neutral", warning: "warning", critical: "danger" } as const;

export default function SecuritySection() {
  const [tab, setTab] = useState<TabKey>("sessions");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  // Rate limiting
  const [limits, setLimits] = useState<{ windowMs: number; maxPerUser: number; maxPerIp: number } | null>(null);
  const [blocks, setBlocks] = useState<RateBlock[]>([]);
  // Plagiarism
  const [plagiarism, setPlagiarism] = useState<PlagiarismCase[]>([]);
  // Audit
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  // Traffic
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  // Alerts
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [alertsPage, setAlertsPage] = useState(1);
  const [liveFeed, setLiveFeed] = useState<AlertItem[]>([]);

  const toastShown = useRef<Set<number>>(new Set());

  const loadOverview = useCallback(async () => {
    try {
      const res = await adminApi.get<Overview>("/admin/security/overview");
      setOverview(res.data);
    } catch (err) {
      setError(adminErrorMessage(err));
    }
  }, []);

  const loadTab = useCallback(async () => {
    try {
      if (tab === "sessions") {
        const res = await adminApi.get("/admin/security/sessions?limit=200");
        setSessions(res.data.sessions);
      } else if (tab === "rate") {
        const res = await adminApi.get("/admin/security/rate-limit");
        setLimits(res.data.limits);
        setBlocks(res.data.blocks);
      } else if (tab === "plagiarism") {
        const res = await adminApi.get("/admin/security/plagiarism?sinceHours=48&minTeams=2");
        setPlagiarism(res.data.cases);
      } else if (tab === "traffic") {
        const res = await adminApi.get("/admin/security/traffic");
        setTraffic(res.data);
      } else if (tab === "audit") {
        const res = await adminApi.get(`/admin/security/audit?page=${auditPage}&limit=15`);
        setAudit(res.data.entries);
        setAuditTotal(res.data.total);
      } else if (tab === "alerts") {
        const res = await adminApi.get(`/admin/security/alerts?page=${alertsPage}&limit=20&acknowledged=false`);
        setAlerts(res.data.alerts);
        setAlertsTotal(res.data.total);
      }
    } catch (err) {
      setError(adminErrorMessage(err));
    }
  }, [tab, auditPage, alertsPage]);

  useEffect(() => {
    loadOverview();
    loadTab();
  }, [loadOverview, loadTab]);

  // Live alert push
  useEffect(() => {
    const off = connectAdminEvents(
      (event, data) => {
        if (event === "security-alert" && data?.id) {
          setLiveFeed((prev) => [data, ...prev].slice(0, 30));
          setOverview((o) => (o ? { ...o, openAlerts: o.openAlerts + 1 } : o));
          if (!toastShown.current.has(data.id)) {
            toastShown.current.add(data.id);
            toast[data.severity === "critical" ? "error" : data.severity === "warning" ? "custom" : "success"](
              `${data.title}${data.message ? ` — ${data.message}` : ""}`,
              data.severity === "warning" ? { icon: <ShieldAlert className="w-4 h-4 text-warning" />, duration: 8000 } : undefined
            );
          }
        }
      },
      undefined,
      () => {
        // Reconnect handled by the client; just refresh counts on failure
      }
    );
    return off;
  }, []);

  const refresh = () => {
    loadOverview();
    loadTab();
  };

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Security"
        description="Real, automated defenses — sessions, rate limiting, plagiarism, traffic and live alerts."
        actions={
          <div className="flex items-center gap-2">
            {overview && overview.openAlerts > 0 && (
              <BadgePill tone="danger">
                <BellRing className="w-3 h-3 mr-1" /> {overview.openAlerts} open
              </BadgePill>
            )}
            <Btn size="sm" variant="outline" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Btn>
          </div>
        }
      />

      {/* Live alert ticker */}
      {liveFeed.length > 0 && (
        <Card title="Live events" bodyClassName="p-3">
          <ScrollArea className="max-h-40" fadeClassName="from-void-2">
            <AnimatedList className="items-stretch pr-1">
              {liveFeed.map((a, idx) => (
                <AnimatedListItem key={a.id} delay={Math.min(idx * 0.04, 0.25)}>
                  <div className="flex items-center gap-2 text-xs">
                    <BadgePill tone={SEVERITY_TONE[a.severity]}>{a.severity}</BadgePill>
                    <span className="font-mono text-muted">{fmtDate(a.createdAt)}</span>
                    <span className="text-white font-medium truncate">{a.title}</span>
                  </div>
                </AnimatedListItem>
              ))}
            </AnimatedList>
          </ScrollArea>
        </Card>
      )}

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Admin sessions" value={overview.activeAdminSessions} icon={ShieldCheck} tone="primary" />
          <StatCard label="User sessions" value={overview.activeUserSessions} icon={KeyRound} tone="secondary" />
          <StatCard label="Open alerts" value={overview.openAlerts} icon={BellRing} tone={overview.openAlerts > 0 ? "danger" : "neutral"} />
          <StatCard label="Rate blocks" value={overview.activeRateBlocks} icon={Ban} tone={overview.activeRateBlocks > 0 ? "warning" : "neutral"} />
          <StatCard label="Traffic" value={`${overview.trafficRps} rps`} icon={Activity} tone={overview.trafficSpike ? "danger" : "neutral"} />
          <StatCard label="Failed logins 24h" value={overview.failedLogins24h} icon={UserX} tone={overview.failedLogins24h > 10 ? "danger" : "neutral"} />
        </div>
      )}

      {/* Sidebar navigation + panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-3 items-start">
        <aside className="lg:sticky lg:top-8">
          <div className="rounded-2xl border border-black/50 bg-black/25 backdrop-blur-md p-1.5 lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-primary/15 via-violet/10 to-transparent text-white border-primary/20 shadow-[0_0_20px_rgba(255,23,68,0.12)]"
                      : "text-muted hover:text-white hover:bg-white/5 border-transparent"
                  }`}
                >
                  {active && (
                    <i
                      aria-hidden
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-secondary"
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${active ? "text-secondary" : ""}`} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
          </div>
        </aside>

        <div className="space-y-6 min-w-0">
        {tab === "sessions" && (
          <SessionsPanel sessions={sessions} busy={busy} onRevoke={(s) => run(() => adminApi.post(`/admin/security/sessions/${s.id}/revoke?type=${s.type}`), `${s.type === "admin" ? "Admin" : "User"} session terminated`)} onRevokeAll={(kind) => run(() => adminApi.post(`/admin/security/sessions/revoke-all?kind=${kind}`), "All sessions terminated")} />
        )}

        {tab === "rate" && (
          <RateLimitPanel
            limits={limits}
            blocks={blocks}
            busy={busy}
            onSave={(patch) => run(() => adminApi.patch("/admin/security/rate-limit", patch), "Rate limit updated")}
            onClear={() => run(() => adminApi.post("/admin/security/rate-limit/clear", {}), "All blocks cleared")}
            onClearOne={(key) => run(() => adminApi.post("/admin/security/rate-limit/clear", { key }), "Block cleared")}
          />
        )}

        {tab === "plagiarism" && <PlagiarismPanel cases={plagiarism} />}

        {tab === "traffic" && <TrafficPanel traffic={traffic} />}

        {tab === "alerts" && (
          <AlertsPanel
            alerts={alerts}
            total={alertsTotal}
            page={alertsPage}
            busy={busy}
            setPage={setAlertsPage}
            onAck={(id) => run(() => adminApi.post(`/admin/security/alerts/${id}/acknowledge`), "Alert acknowledged")}
            onClearAcked={() => run(() => adminApi.post("/admin/security/alerts/clear-acknowledged"), "Acknowledged alerts removed")}
          />
        )}

        {tab === "audit" && (
          <AuditPanel audit={audit} total={auditTotal} page={auditPage} setPage={setAuditPage} />
        )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 1. Session Management                                                     */
/* ------------------------------------------------------------------------ */
function SessionsPanel({ sessions, busy, onRevoke, onRevokeAll }: {
  sessions: Session[];
  busy: boolean;
  onRevoke: (s: Session) => void;
  onRevokeAll: (kind: "admin" | "user") => void;
}) {
  const admins = sessions.filter((s) => s.type === "admin");
  const users = sessions.filter((s) => s.type === "user");
  return (
    <div className="space-y-6">
      <Card
        title="Admin vault sessions"
        subtitle="Active administrator logins — force logout at any time"
        actions={
          <ConfirmBtn tone="danger" disabled={busy} onConfirm={() => onRevokeAll("admin")} confirmText="Revoke all admin sessions">
            Revoke all
          </ConfirmBtn>
        }
      >
        {admins.length === 0 ? (
          <EmptyState title="No active admin sessions" />
        ) : (
          <TableWrap headers={["Operator", "IP", "Client", "Expires", "Action"]}>
            {admins.map((s) => (
              <tr key={`a${s.id}`}>
                <Td className="text-white font-semibold">{s.label}</Td>
                <Td className="font-mono text-[11px] text-muted">{s.ipAddress ?? "—"}</Td>
                <Td className="text-muted max-w-[180px] truncate" title={s.userAgent ?? ""}>{s.userAgent ?? "—"}</Td>
                <Td className="text-muted">{fmtDate(s.expiresAt)}</Td>
                <Td>
                  <Btn size="sm" variant="danger" disabled={busy} onClick={() => onRevoke(s)}>
                    <Lock className="w-3 h-3" /> Force out
                  </Btn>
                </Td>
              </tr>
            ))}
          </TableWrap>
        )}
      </Card>

      <Card
        title="Active user sessions"
        subtitle="Competitor logins — terminate a session to force re-login"
        actions={
          <ConfirmBtn tone="warning" disabled={busy} onConfirm={() => onRevokeAll("user")} confirmText="Revoke all user sessions">
            Terminate all
          </ConfirmBtn>
        }
      >
        {users.length === 0 ? (
          <EmptyState title="No active user sessions" />
        ) : (
          <TableWrap headers={["User", "IP", "Client", "Expires", "Action"]}>
            {users.map((s) => (
              <tr key={`u${s.id}`}>
                <Td className="text-white font-semibold">{s.label}</Td>
                <Td className="font-mono text-[11px] text-muted">{s.ipAddress ?? "—"}</Td>
                <Td className="text-muted max-w-[180px] truncate" title={s.userAgent ?? ""}>{s.userAgent ?? "—"}</Td>
                <Td className="text-muted">{fmtDate(s.expiresAt)}</Td>
                <Td>
                  <Btn size="sm" variant="danger" disabled={busy} onClick={() => onRevoke(s)}>
                    <Lock className="w-3 h-3" /> Force out
                  </Btn>
                </Td>
              </tr>
            ))}
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 2. Submission rate limiting                                               */
/* ------------------------------------------------------------------------ */
function RateLimitPanel({ limits, blocks, busy, onSave, onClear, onClearOne }: {
  limits: { windowMs: number; maxPerUser: number; maxPerIp: number } | null;
  blocks: RateBlock[];
  busy: boolean;
  onSave: (patch: { windowMs: number; maxPerUser: number; maxPerIp: number }) => void;
  onClear: () => void;
  onClearOne: (key: string) => void;
}) {
  const [form, setForm] = useState(limits ?? { windowMs: 15000, maxPerUser: 6, maxPerIp: 20 });
  useEffect(() => {
    if (limits) setForm(limits);
  }, [limits]);

  return (
    <div className="space-y-6">
      <Card title="Flag submission throttle" subtitle="Blocks automated flag guessing in a sliding window, per user and per IP">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Window (ms)</span>
            <input
              type="number"
              min={1000}
              value={form.windowMs}
              onChange={(e) => setForm({ ...form, windowMs: Number(e.target.value) })}
              className="w-full bg-void-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary/50"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Max / user</span>
            <input
              type="number"
              min={1}
              value={form.maxPerUser}
              onChange={(e) => setForm({ ...form, maxPerUser: Number(e.target.value) })}
              className="w-full bg-void-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary/50"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">Max / IP</span>
            <input
              type="number"
              min={1}
              value={form.maxPerIp}
              onChange={(e) => setForm({ ...form, maxPerIp: Number(e.target.value) })}
              className="w-full bg-void-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary/50"
            />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <Btn size="sm" disabled={busy} onClick={() => onSave(form)}>
            <Gauge className="w-3.5 h-3.5" /> Apply limits
          </Btn>
          <ConfirmBtn tone="warning" disabled={busy} onConfirm={onClear} confirmText="Clear all blocks">
            <Ban className="w-3 h-3 mr-1" /> Clear all blocks
          </ConfirmBtn>
        </div>
        <p className="text-[11px] text-muted mt-4">
          When a user or IP exceeds the limit, submissions are refused for 4x the window and an automated alert is raised.
        </p>
      </Card>

      <Card title="Active blocks" subtitle="Entities currently throttled by the guard">
        {blocks.length === 0 ? (
          <EmptyState title="No active blocks" description="No entity is currently rate-limited." />
        ) : (
          <ScrollArea className="max-h-[360px]" fadeClassName="from-void-2">
            <div className="space-y-2 pr-1">
              {blocks.map((b) => (
                <div key={b.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-void-2/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-white truncate">{b.key}</p>
                    <p className="text-[10px] text-muted">
                      {b.reason} · {b.count} hits · expires {fmtDate(b.blockedUntil)}
                    </p>
                </div>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => onClearOne(b.key)}>
                  <Trash2 className="w-3 h-3" /> Clear
                </Btn>
              </div>
            ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 3. Plagiarism detection                                                   */
/* ------------------------------------------------------------------------ */
function PlagiarismPanel({ cases }: { cases: PlagiarismCase[] }) {
  return (
    <Card
      title="Plagiarism detection"
      subtitle="Identical flag submissions observed across DIFFERENT teams within the last 48h"
    >
      {cases.length === 0 ? (
        <EmptyState title="No suspicious patterns" description="No identical flags were shared across distinct teams in the window." />
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <BadgePill tone={c.isCorrect ? "success" : "danger"}>{c.isCorrect ? "correct" : "incorrect"}</BadgePill>
                <span className="font-semibold text-white text-sm">{c.challengeTitle}</span>
                <span className="text-muted text-[11px]">#{c.challengeId}</span>
                <span className="text-muted text-[11px] ml-auto font-mono">{c.count} submissions</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {c.teams.map((t) => (
                  <BadgePill key={t} tone="secondary">{t}</BadgePill>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.users.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-void-2 border border-white/10 text-[10px] font-mono text-muted">
                    <Radar className="w-3 h-3 text-primary" /> {u.username}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-muted mt-2">
                First {fmtDate(c.firstSeen)} · Last {fmtDate(c.lastSeen)} · Flag hash <span className="font-mono">{c.flagHash.slice(0, 16)}…</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------------ */
/* 4. Audit trail                                                            */
/* ------------------------------------------------------------------------ */
function AuditPanel({ audit, total, page, setPage }: {
  audit: AuditEntry[];
  total: number;
  page: number;
  setPage: (p: number) => void;
}) {
  return (
    <Card title="Audit trail" subtitle="Every privileged action and settings change, attributed to an operator">
      {audit.length === 0 ? (
        <EmptyState title="No audit entries" />
      ) : (
        <>
          <TableWrap headers={["Action", "Category", "Operator", "IP", "When"]}>
            {audit.map((a) => (
              <tr key={a.id}>
                <Td className="font-mono text-[11px] text-white">{a.action}</Td>
                <Td>
                  <BadgePill tone="neutral">{a.category}</BadgePill>
                </Td>
                <Td className="text-muted">{a.adminUsername}</Td>
                <Td className="font-mono text-[11px] text-muted">{a.ipAddress ?? "—"}</Td>
                <Td className="text-muted">{fmtDate(a.createdAt)}</Td>
              </tr>
            ))}
          </TableWrap>
          <Pagination page={page} total={total} limit={15} onChange={setPage} />
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------------ */
/* 5. Traffic analysis                                                       */
/* ------------------------------------------------------------------------ */
function TrafficPanel({ traffic }: { traffic: Traffic | null }) {
  if (!traffic) return <Spinner label="Sampling traffic" />;
  const maxPath = Math.max(1, ...traffic.topPaths.map((p) => p.count));
  return (
    <div className="space-y-6">
      <Card title="Live throughput" subtitle={`Rolling window: ${traffic.windowSeconds}s baseline`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Current" value={`${traffic.rps.current} rps`} tone={traffic.rps.current > traffic.rps.baseline * 3 ? "danger" : "primary"} />
          <StatCard label="Baseline" value={`${traffic.rps.baseline} rps`} tone="neutral" />
          <StatCard label="Sampled" value={traffic.total} tone="secondary" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">Status codes</p>
        <div className="space-y-1.5 mb-6">
          {traffic.byStatus.map((s) => (
            <div key={s.status} className="flex items-center gap-2 text-xs">
              <span className="w-10 font-mono text-muted">{s.status}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${Math.min(100, (s.count / Math.max(1, traffic.byStatus[0]?.count)) * 100)}%` }} />
              </div>
              <span className="w-12 text-right font-mono text-white">{s.count}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">Top source IPs</p>
        <div className="flex flex-wrap gap-1.5">
          {traffic.topIps.map((i) => (
            <span key={i.ip} className="px-2 py-0.5 rounded-md bg-void-2 border border-white/10 text-[10px] font-mono text-muted">
              {i.ip} · {i.count}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Endpoint traffic" subtitle="Most-hit paths in the rolling window">
        <ScrollArea className="max-h-[420px]" fadeClassName="from-void-2">
          <div className="space-y-3 pr-1">
            {traffic.topPaths.map((p) => (
              <div key={p.path} className="rounded-xl border border-white/10 bg-void-2/40 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="font-mono text-[11px] text-white truncate">{p.path}</span>
                  <BadgePill tone={p.errors > 0 ? "warning" : "success"}>{p.count}</BadgePill>
                </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-secondary to-primary" style={{ width: `${(p.count / maxPath) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted mt-1.5">
                {p.errors > 0 ? `${p.errors} errors · ` : ""}{Math.round(p.avgLatency)}ms avg
              </p>
            </div>
          ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 6. Real-time alerts                                                       */
/* ------------------------------------------------------------------------ */
function AlertsPanel({ alerts, total, page, busy, setPage, onAck, onClearAcked }: {
  alerts: AlertItem[];
  total: number;
  page: number;
  busy: boolean;
  setPage: (p: number) => void;
  onAck: (id: number) => void;
  onClearAcked: () => void;
}) {
  return (
    <Card
      title="Security alerts"
      subtitle="Automated notifications — brute-force, rate-limit blocks, traffic anomalies, plagiarism"
      actions={
        <ConfirmBtn tone="danger" disabled={busy} onConfirm={onClearAcked} confirmText="Remove acknowledged alerts">
          <CheckCheck className="w-3.5 h-3.5 mr-1" /> Clear acknowledged
        </ConfirmBtn>
      }
    >
      {alerts.length === 0 ? (
        <EmptyState title="No open alerts" description="Acknowledge alerts to remove them from this feed." />
      ) : (
        <>
          <AnimatedList className="items-stretch">
            {alerts.map((a, idx) => (
              <AnimatedListItem key={a.id} delay={Math.min(idx * 0.05, 0.3)}>
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-void-2/40 px-4 py-3">
                  <BadgePill tone={SEVERITY_TONE[a.severity]}>{a.severity}</BadgePill>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold">{a.title}</p>
                    {a.message && <p className="text-muted text-xs mt-0.5">{a.message}</p>}
                    <p className="text-[10px] text-muted mt-1">
                      {a.category} · {fmtDate(a.createdAt)}
                    </p>
                  </div>
                  <Btn size="sm" variant="outline" disabled={busy} onClick={() => onAck(a.id)}>
                    <CheckCheck className="w-3 h-3 mr-1" /> Ack
                  </Btn>
                </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
