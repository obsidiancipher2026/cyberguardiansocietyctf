"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  Bomb,
  CalendarClock,
  CheckCircle2,
  Flame,
  KeyRound,
  Lock,
  Loader2,
  Play,
  RefreshCcw,
  Settings2,
  ShieldAlert,
  Square,
  Trash2,
  Unlock,
  UserCog,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, adminErrorMessage } from "@/lib/adminApi";
import { Btn, Card, ErrorState, Field, Modal, Select, Spinner, TextArea, TextInput, Toggle } from "../ui";
import LiveCompetitionCountdown from "@/components/ui/LiveCompetitionCountdown";

type Competition = {
  id: number;
  name: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  freezeOffsetMinutes: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
};

type Platform = {
  nodeEnv: string;
  appUrl: string;
  maxUploadMb: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  adminSessionTtlDays: number;
  adminAccessTtl: string;
  adminLoginMaxAttempts: number;
  adminLockoutMinutes: number;
};

type IpBlock = {
  id: number;
  ip: string;
  reason: string | null;
  createdAt: string;
};

type DangerAction = {
  label: string;
  description: string;
  keyword: string;
  endpoint: string;
  method: "post" | "delete";
  icon: React.ElementType;
  confirmTitle: string;
};

const DANGER_ACTIONS: DangerAction[] = [
  {
    label: "Wipe all logs",
    description: "Permanently deletes every entry from the Logs management section (activity log).",
    keyword: "LOGS",
    endpoint: "/admin/danger/logs",
    method: "post",
    icon: Activity,
    confirmTitle: "Wipe the entire activity log?",
  },
  {
    label: "Wipe submission logs",
    description: "Deletes every flag submission and resets all scores, solve counts and team points.",
    keyword: "SUBMISSIONS",
    endpoint: "/admin/danger/submissions",
    method: "post",
    icon: Trash2,
    confirmTitle: "Wipe every submission and reset all scores?",
  },
  {
    label: "Block all user IPs",
    description: "Every IP address found in submissions, logs, sessions and login attempts is blocked from the platform.",
    keyword: "BLOCK",
    endpoint: "/admin/danger/ip-blocks/block-all",
    method: "post",
    icon: Ban,
    confirmTitle: "Block every recorded IP address?",
  },
  {
    label: "Unblock all IPs",
    description: "Removes every IP block. All previously blocked addresses regain access immediately.",
    keyword: "UNBLOCK",
    endpoint: "/admin/danger/ip-blocks/unblock-all",
    method: "post",
    icon: Unlock,
    confirmTitle: "Unblock every IP address?",
  },
  {
    label: "Delete every user permanently",
    description: "Destroys all user accounts with their submissions, purchases, teams and sessions. Administrators are kept.",
    keyword: "USERS",
    endpoint: "/admin/danger/users",
    method: "post",
    icon: UserCog,
    confirmTitle: "Permanently delete every user account?",
  },
  {
    label: "Delete all points from scoreboard",
    description: "Wipes every flag submission and zeroes all team points and solve counts, clearing the scoreboard.",
    keyword: "SCOREBOARD",
    endpoint: "/admin/danger/scoreboard",
    method: "post",
    icon: ShieldAlert,
    confirmTitle: "Wipe every team's points from the scoreboard?",
  },
  {
    label: "Delete all challenges permanently",
    description: "Destroys every challenge with its hints, purchases and submissions. All scores are reset.",
    keyword: "CHALLENGES",
    endpoint: "/admin/danger/challenges",
    method: "post",
    icon: Flame,
    confirmTitle: "Permanently delete every challenge?",
  },
  {
    label: "Delete all announcements",
    description: "Removes every announcement from the platform.",
    keyword: "ANNOUNCEMENTS",
    endpoint: "/admin/danger/announcements",
    method: "post",
    icon: AlertTriangle,
    confirmTitle: "Delete every announcement?",
  },
  {
    label: "Reset competition progress & timer",
    description: "Wipes submissions, resets scores and zeros the countdown timer back to the start.",
    keyword: "RESET",
    endpoint: "/admin/danger/reset-competition",
    method: "post",
    icon: RefreshCcw,
    confirmTitle: "Reset the competition to zero?",
  },
  {
    label: "Force password reset for all users",
    description: "Every user must create a new passphrase at their next sign-in; all user sessions are revoked.",
    keyword: "PASSWORDS",
    endpoint: "/admin/danger/force-password-reset",
    method: "post",
    icon: Lock,
    confirmTitle: "Force every user to change their password?",
  },
  {
    label: "Wipe security audit trail",
    description: "Deletes every entry from the admin audit trail shown in the Security section.",
    keyword: "AUDIT",
    endpoint: "/admin/danger/audit",
    method: "post",
    icon: ShieldAlert,
    confirmTitle: "Wipe the security audit trail?",
  },
];

type SettingsTabKey = "competition" | "maintenance" | "credentials" | "danger" | "ips";

const SETTINGS_TABS: { key: SettingsTabKey; label: string; icon: React.ElementType }[] = [
  { key: "competition", label: "Competition", icon: CalendarClock },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "credentials", label: "Credentials", icon: KeyRound },
  { key: "danger", label: "Danger Zone", icon: Flame },
  { key: "ips", label: "IP Blocks", icon: Ban },
];

function DangerActionRow({ action, onDone }: { action: DangerAction; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const Icon = action.icon;

  const run = async () => {
    if (typed.trim().toUpperCase() !== action.keyword) return;
    setBusy(true);
    try {
      const res = await adminApi[action.method](`${action.endpoint}`);
      const message = res.data?.message ?? "Done";
      toast.success(message);
      setOpen(false);
      setTyped("");
      onDone();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between py-3.5 border-b border-white/5 last:border-0">
        <div className="flex items-start gap-3 min-w-0">
          <span className="shrink-0 w-9 h-9 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-danger" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-white text-sm">{action.label}</p>
            <p className="text-[11px] text-muted mt-0.5 leading-snug">{action.description}</p>
          </div>
        </div>
        <Btn size="sm" variant="danger" className="shrink-0" onClick={() => setOpen(true)}>
          <Bomb className="w-3.5 h-3.5" /> Execute
        </Btn>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setTyped(""); }} title={action.confirmTitle} subtitle={`Type ${action.keyword} to confirm — this cannot be undone.`}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-danger/10 border border-danger/25">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-[11px] text-danger font-medium leading-relaxed">
              This destructive action permanently removes data. The operation is recorded in the security audit trail.
            </p>
          </div>
          <Field label={`Type "${action.keyword}" to confirm`}>
            <TextInput
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={action.keyword}
              autoFocus
              className="uppercase font-mono"
            />
          </Field>
          <div className="flex items-center justify-end gap-2">
            <Btn size="sm" variant="ghost" disabled={busy} onClick={() => { setOpen(false); setTyped(""); }}>
              Cancel
            </Btn>
            <Btn size="sm" variant="danger" disabled={busy || typed.trim().toUpperCase() !== action.keyword} onClick={run}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Execute
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function SettingsSection() {
  const [tab, setTab] = useState<SettingsTabKey>("competition");
  const [data, setData] = useState<{ competition: Competition | null; platform: Platform } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [freezeOffset, setFreezeOffset] = useState(30);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [newBlockIp, setNewBlockIp] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [blocks, setBlocks] = useState<IpBlock[]>([]);

  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.get<{ settings: { competition: Competition | null; platform: Platform } }>("/admin/settings/");
      const c = res.data.settings.competition;
      setData(res.data.settings);
      if (c) {
        setName(c.name);
        setStatus(c.status);
        setStartTime(c.startTime ? new Date(c.startTime).toISOString().slice(0, 16) : "");
        setEndTime(c.endTime ? new Date(c.endTime).toISOString().slice(0, 16) : "");
        setFreezeOffset(c.freezeOffsetMinutes);
        setMaintenanceMode(c.maintenanceMode);
        setMaintenanceMessage(c.maintenanceMessage ?? "");
      }
    } catch (err) {
      setError(adminErrorMessage(err));
    }
  }, []);

  const loadBlocks = useCallback(async () => {
    try {
      const res = await adminApi.get<{ blocks: IpBlock[] }>("/admin/danger/ip-blocks");
      setBlocks(res.data.blocks);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    load();
    loadBlocks();
  }, [load, loadBlocks]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Spinner label="Loading platform settings" />;

  const run = async (fn: () => Promise<unknown>, msg: string, then?: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      then?.();
      load();
    } catch (err) {
      toast.error(adminErrorMessage(err));
      // Resync from the server so optimistic toggles revert to the real state.
      load();
    } finally {
      setBusy(false);
    }
  };

  const saveCompetition = () =>
    run(
      () =>
        adminApi.patch("/admin/settings/", {
          name,
          status,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
          freezeOffsetMinutes: freezeOffset,
        }),
      "Competition settings saved"
    );

  // Countdown start: force status live and persist the schedule times so the
  // clock has a target. Without endTime the countdown would stay idle.
  const startCountdown = () =>
    run(
      async () => {
        await adminApi.patch("/admin/settings/", {
          status: "live",
          startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : null,
        });
      },
      "Countdown started — competition is live",
      () => load()
    );

  // Countdown stop: force the ended state so the clock sits at zero.
  const stopCountdown = () =>
    run(
      () => adminApi.patch("/admin/settings/", { status: "ended" }),
      "Countdown stopped",
      () => load()
    );

  // Reset countdown to zero: clear both timestamps and return to upcoming.
  const resetCountdown = () =>
    run(
      () =>
        adminApi.patch("/admin/settings/", {
          status: "upcoming",
          startTime: null,
          endTime: null,
        }),
      "Countdown reset to zero",
      () => load()
    );

  const setMaintenance = (enabled: boolean) =>
    run(
      () => adminApi.post("/admin/live/maintenance", { enabled, message: maintenanceMessage }),
      enabled ? "Maintenance mode enabled — entire platform locked down" : "Maintenance mode disabled",
      () => load()
    );

  const updateMaintenanceMessage = () =>
    run(
      () => adminApi.patch("/admin/live/state", { maintenanceMessage }),
      "Maintenance message updated",
      () => load()
    );

  const updateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    run(
      () =>
        adminApi.patch("/admin/settings/credentials", {
          currentPassword,
          ...(username.trim() ? { username: username.trim().toLowerCase() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(newPassword ? { newPassword } : {}),
        }),
      "Administrator credentials updated"
    ).then(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  };

  const addBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockIp.trim()) return;
    run(
      () =>
        adminApi.post("/admin/danger/ip-blocks", {
          ip: newBlockIp.trim(),
          reason: newBlockReason.trim() || "Blocked by administrator",
        }),
      `IP ${newBlockIp.trim()} blocked`
    ).then(() => {
      setNewBlockIp("");
      setNewBlockReason("");
      loadBlocks();
    });
  };

  const unblockIp = (id: number) =>
    run(
      () => adminApi.delete(`/admin/danger/ip-blocks/${id}`),
      "IP unblocked"
    ).then(loadBlocks);

  const comp = data.competition;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-3 items-start">
        {/* Section sidebar */}
        <aside className="lg:sticky lg:top-8">
          <div className="rounded-2xl border border-black/50 bg-black/25 backdrop-blur-md p-1.5 lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
            {SETTINGS_TABS.map((t) => {
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
      {tab === "competition" && (
      /* 1 — Competition (countdown control) */
      <Card
        title="Competition"
        subtitle="Countdown timer control, start/stop and mission schedule"
        actions={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25 font-body text-[10px] font-bold uppercase tracking-wider">
            <span className={`w-1.5 h-1.5 rounded-full ${status === "live" ? "bg-success animate-pulse" : "bg-muted"}`} />
            {status}
          </span>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Competition name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={["upcoming", "live", "frozen", "ended"].map((s) => ({ value: s, label: s }))}
              />
            </Field>
            <Field label="Start time (countdown starts)" hint="Local date and time">
              <TextInput type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="End time (countdown ends)" hint="Local date and time">
              <TextInput type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
            <Field label="Scoreboard freeze offset" hint="Minutes before the end the board freezes">
              <TextInput
                type="number"
                min={0}
                value={freezeOffset}
                onChange={(e) => setFreezeOffset(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-white/10 bg-void-2/70 p-4">
            <p className="text-[10px] font-body font-semibold uppercase tracking-[0.16em] text-muted mb-3 flex items-center gap-2">
              <CalendarClock className="w-3.5 h-3.5 text-primary" /> Live countdown preview
            </p>
            <LiveCompetitionCountdown />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end border-t border-white/10 pt-4">
            <Btn size="sm" variant="success" disabled={busy} onClick={startCountdown}>
              <Play className="w-3.5 h-3.5" /> Start countdown
            </Btn>
            <Btn size="sm" variant="danger" disabled={busy} onClick={stopCountdown}>
              <Square className="w-3.5 h-3.5" /> Stop countdown
            </Btn>
            <Btn size="sm" variant="outline" disabled={busy} onClick={resetCountdown}>
              <RefreshCcw className="w-3.5 h-3.5" /> Reset countdown to zero
            </Btn>
            <Btn size="sm" disabled={busy} onClick={saveCompetition}>
              <Settings2 className="w-3.5 h-3.5" /> Save schedule
            </Btn>
          </div>
        </div>
      </Card>
      )}

      {tab === "maintenance" && (
      /* 2 — Maintenance mode */
      <Card
        title="Maintenance mode"
        subtitle="Lock down the entire platform while you work"
        actions={
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[10px] font-bold uppercase tracking-wider border ${
            maintenanceMode ? "bg-danger/15 text-danger border-danger/30" : "bg-success/10 text-success border-success/25"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${maintenanceMode ? "bg-danger animate-pulse" : "bg-success"}`} />
            {maintenanceMode ? "Locked" : "Open"}
          </span>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-void-2/70 p-4">
            <div className="min-w-0">
              <p className="font-display font-bold text-white text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-warning" />
                {maintenanceMode ? "Platform is locked down" : "Platform is fully accessible"}
              </p>
              <p className="text-[11px] text-muted mt-1">
                When enabled, every public page is replaced by the maintenance screen. The admin vault keeps working.
              </p>
            </div>
            <Toggle checked={maintenanceMode} onChange={setMaintenance} label="" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Field label="Maintenance message" hint="Shown to visitors on the lockdown screen">
              <TextArea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="We are upgrading the arena. Estimated downtime: 30 minutes."
                maxLength={512}
              />
            </Field>
            <div className="flex justify-end">
              <Btn size="sm" disabled={busy} onClick={updateMaintenanceMessage}>
                <Settings2 className="w-3.5 h-3.5" /> Update message
              </Btn>
            </div>
          </div>
        </div>
      </Card>
      )}

      {tab === "credentials" && (
      /* 4 — Credentials manager */
      <Card title="Credentials manager" subtitle="Change the administrator username, email and password">
        <form onSubmit={updateCredentials} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Current password" hint="Required to authorize changes">
              <TextInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </Field>
            <Field label="New administrator username" hint="Leave empty to keep current">
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Leave empty to keep current" />
            </Field>
            <Field label="New administrator email" hint="Leave empty to keep current">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Leave empty to keep current" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="New password" hint="Min 12 characters, leave empty to keep">
                <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={12} />
              </Field>
              <Field label="Confirm new password">
                <TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={12} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end">
            <Btn type="submit" size="sm" disabled={busy}>
              <KeyRound className="w-3.5 h-3.5" /> Update credentials
            </Btn>
          </div>
        </form>
      </Card>
      )}

{tab === "danger" && (
      /* 5 — Danger zone */
      <Card
        title={
          <span className="flex items-center gap-2 text-danger">
            <Flame className="w-4 h-4" /> Danger zone
          </span>
        }
        subtitle="Destructive operations. Every action requires a typed confirmation and is recorded in the audit trail."
      >
        <div className="divide-y divide-white/5">
          {DANGER_ACTIONS.map((action) => (
            <DangerActionRow
              key={action.endpoint}
              action={action}
              onDone={() => {
                load();
                loadBlocks();
              }}
            />
          ))}
        </div>
      </Card>
      )}

      {tab === "ips" && (
      /* IP block manager */
      <Card title="Blocked IP addresses" subtitle={`${blocks.length} address${blocks.length === 1 ? "" : "es"} currently blocked`}>
        <div className="space-y-4">
          <form onSubmit={addBlock} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3">
            <Field label="IP address">
              <TextInput value={newBlockIp} onChange={(e) => setNewBlockIp(e.target.value)} placeholder="203.0.113.42" />
            </Field>
            <Field label="Reason">
              <TextInput value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} placeholder="Suspected automated guessing" />
            </Field>
            <div className="flex items-end">
              <Btn type="submit" size="sm" variant="danger" disabled={busy || !newBlockIp.trim()}>
                <Ban className="w-3.5 h-3.5" /> Block IP
              </Btn>
            </div>
          </form>

          {blocks.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-2" />
              <p className="text-xs text-muted">No IP addresses are blocked.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="cgs-table w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    {["IP", "Reason", "Blocked at", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-body font-semibold uppercase tracking-[0.14em] text-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {blocks.map((b) => (
                    <tr key={b.id}>
                      <td className="px-3 py-2.5 text-xs font-mono text-white">{b.ip}</td>
                      <td className="px-3 py-2.5 text-xs text-muted">{b.reason ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted">
                        {new Date(b.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Btn size="sm" variant="ghost" onClick={() => unblockIp(b.id)}>
                          <Unlock className="w-3.5 h-3.5" /> Unblock
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      )}
        </div>
      </div>
    </div>
  );
}