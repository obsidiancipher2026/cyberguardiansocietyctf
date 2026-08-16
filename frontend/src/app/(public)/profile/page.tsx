"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Trophy,
  CheckCircle2,
  Lock,
  Loader2,
  AlertTriangle,
  Zap,
  Users,
  Clock,
  KeyRound,
  Radio,
  CalendarDays,
  BadgeCheck,
  UserRound,
  Crosshair,
  Award,
  Lightbulb,
  Skull,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { connectRealtime } from "@/lib/realtime";
import { validatePassword, validateConfirmPassword } from "@/lib/validation";
import { SmoothInput } from "@/components/ui/input";
import type { PublicUser } from "@cgs-ctf/shared";

type ProfileStats = {
  points: number;
  bloodPoints: number;
  rank: number | null;
  solves: number;
  totalSubmissions: number;
  hintSpent: number;
  teamPoints: number;
};

type SolveItem = {
  id: number;
  at: string;
  points: number;
  challenge: {
    id: number;
    title: string;
    category: string;
  } | null;
};

const CAT_TONE: Record<string, string> = {
  web: "text-secondary border-secondary/30 bg-secondary/10",
  pwn: "text-primary border-primary/30 bg-primary/10",
  crypto: "text-violet border-violet/30 bg-violet/10",
  forensics: "text-secondary border-secondary/30 bg-secondary/10",
  reversing: "text-primary border-primary/30 bg-primary/10",
  osint: "text-secondary border-secondary/30 bg-secondary/10",
  misc: "text-violet border-violet/30 bg-violet/10",
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [solves, setSolves] = useState<SolveItem[]>([]);
  const [live, setLive] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Password change state (the only credential a user may change here)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passDetails, setPassDetails] = useState<string[]>([]);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const liveTimeoutRef = useRef<number | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get("/profile/me");
      if (!mountedRef.current) return;
      setUser(res.data.user);
      setStats(res.data.stats);
      setSolves(res.data.solves ?? []);
      setLastSync(new Date());
      localStorage.setItem("cgs_user", JSON.stringify(res.data.user));
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("cgs_user");
        router.push("/auth/login");
      } else {
        setError("Failed to load profile data. Please refresh.");
      }
    }
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    loadProfile().finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    // Real-time: a solve (or scoreboard reset) anywhere on the platform
    // immediately refreshes this profile.
    const off = connectRealtime(
      (event, data) => {
        if (event === "scoreboard" && data?.type === "solve") {
          setLive(true);
          void loadProfile();
          if (liveTimeoutRef.current !== null) window.clearTimeout(liveTimeoutRef.current);
          liveTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) setLive(false);
          }, 2500);
        }
      },
      () => {
        if (mountedRef.current) setLive(true);
      },
      () => {
        if (mountedRef.current) setLive(false);
      }
    );

    return () => {
      mountedRef.current = false;
      if (liveTimeoutRef.current !== null) window.clearTimeout(liveTimeoutRef.current);
      off();
    };
  }, [loadProfile, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassDetails([]);
    setPassSuccess(null);

    const pwError = validatePassword(newPassword);
    if (pwError) {
      setPassError(pwError);
      return;
    }
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    if (confirmError) {
      setPassError(confirmError);
      return;
    }
    if (!currentPassword) {
      setPassError("Current passphrase is required.");
      return;
    }

    setPassLoading(true);

    try {
      const res = await api.post("/profile/me/password", {
        currentPassword,
        newPassword,
      });
      setPassSuccess(res.data?.message || "Passphrase updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const data = err?.response?.data?.error;
      const msg = data?.message ?? "Failed to change passphrase.";
      setPassError(msg);
      const details = data?.details;
      if (Array.isArray(details)) {
        setPassDetails(details.map((d: unknown) => (typeof d === "string" ? d : String(d))));
      }
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="font-body text-xs text-muted">Retrieving operative profile telemetry…</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="pt-32 pb-20 max-w-md mx-auto px-4 text-center space-y-4">
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
          {error || "Unable to access profile."}
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-deep text-white font-body text-xs font-bold"
        >
          AUTHENTICATE SESSION
        </Link>
      </div>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  const catTone = (c: string) => CAT_TONE[c] ?? CAT_TONE.misc;

  return (
    <ProtectedRoute>
      <div className="pt-28 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ================= Hero / Identity ================= */}
        <section className="relative glass-panel rounded-3xl border border-white/10 overflow-hidden">
          <i aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-violet to-secondary" />
          <div aria-hidden className="absolute -top-28 -right-28 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary via-violet to-secondary p-[2px] shadow-glow-red">
                <div className="w-full h-full rounded-[14px] bg-void-2 flex items-center justify-center">
                  <span className="w-full h-full rounded-[13px] bg-gradient-to-br from-secondary via-secondary-deep to-violet flex items-center justify-center font-display font-black text-5xl text-void uppercase">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              {user.isVerified && (
                <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-success border-2 border-void flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </span>
              )}
            </div>

            {/* Identity */}
            <div className="text-center sm:text-left flex-1 min-w-0 space-y-2.5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted">Operative dossier</p>
                <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight truncate">
                  {user.username}
                </h1>
              </div>
              <p className="font-body text-xs text-muted break-all">{user.email}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-body text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {user.role}
                </span>
                {user.isVerified ? (
                  <span className="px-2.5 py-1 rounded-lg bg-success/15 text-success border border-success/30 font-body text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-warning/15 text-warning border border-warning/30 font-body text-[10px] font-bold uppercase tracking-wider">
                    Unverified
                  </span>
                )}
                {user.teamId && (
                  <span className="px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 font-body text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3" /> Team #{user.teamId}
                  </span>
                )}
              </div>
            </div>

            {/* Sync status */}
            <div className="shrink-0 flex sm:flex-col items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-body text-[10px] font-bold uppercase tracking-wider ${
                  live
                    ? "bg-success/20 text-success border-success/30 animate-pulse"
                    : "bg-white/[0.03] text-muted border-white/10"
                }`}
              >
                <Radio className="w-3 h-3" />
                {live ? "Live sync" : "Synced"}
              </span>
              {lastSync && (
                <p className="font-body text-[10px] text-muted">
                  {lastSync.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ================= Performance stat band ================= */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="relative glass-panel rounded-2xl border border-white/10 p-5 overflow-hidden group">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 text-primary mb-3">
              <Trophy className="w-4 h-4" />
            </span>
            <p className="font-display font-black text-2xl text-white leading-none">{stats?.points ?? 0}</p>
            <p className="font-body text-[9px] text-muted uppercase tracking-[0.18em] mt-1.5">Total Score</p>
          </div>

          <div className="relative glass-panel rounded-2xl border border-white/10 p-5 overflow-hidden group">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 text-primary mb-3">
              <Skull className="w-4 h-4" />
            </span>
            <p className="font-display font-black text-2xl text-white leading-none">{stats?.bloodPoints ?? 0}</p>
            <p className="font-body text-[9px] text-muted uppercase tracking-[0.18em] mt-1.5">Blood Points</p>
          </div>

          <div className="relative glass-panel rounded-2xl border border-white/10 p-5 overflow-hidden group">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/25 text-secondary mb-3">
              <Crosshair className="w-4 h-4" />
            </span>
            <p className="font-display font-black text-2xl text-white leading-none">{stats?.solves ?? 0}</p>
            <p className="font-body text-[9px] text-muted uppercase tracking-[0.18em] mt-1.5">Flags Solved</p>
          </div>

          <div className="relative glass-panel rounded-2xl border border-white/10 p-5 overflow-hidden group">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-warning/10 border border-warning/25 text-warning mb-3">
              <Award className="w-4 h-4" />
            </span>
            <p className="font-display font-black text-2xl text-white leading-none">
              {stats?.rank ? `#${stats.rank}` : "—"}
            </p>
            <p className="font-body text-[9px] text-muted uppercase tracking-[0.18em] mt-1.5">Global Rank</p>
          </div>

          <div className="relative glass-panel rounded-2xl border border-white/10 p-5 overflow-hidden group">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-success/10 border border-success/25 text-success mb-3">
              <Zap className="w-4 h-4" />
            </span>
            <p className="font-display font-black text-2xl text-white leading-none">{stats?.totalSubmissions ?? 0}</p>
            <p className="font-body text-[9px] text-muted uppercase tracking-[0.18em] mt-1.5">Submissions</p>
          </div>

          <div className="relative glass-panel rounded-2xl border border-white/10 p-5 overflow-hidden group">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet/10 border border-violet/25 text-violet mb-3">
              <Lightbulb className="w-4 h-4" />
            </span>
            <p className="font-display font-black text-2xl text-white leading-none">{stats?.hintSpent ?? 0}</p>
            <p className="font-body text-[9px] text-muted uppercase tracking-[0.18em] mt-1.5">Hint Points Spent</p>
          </div>
        </section>

        {/* ================= Two-column body ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,23rem)_1fr] gap-6 items-start">
          {/* ---- Left column: account + security ---- */}
          <div className="space-y-6">
            {/* Account details */}
            <section className="glass-panel p-6 sm:p-7 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <span className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/25 flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-secondary" />
                </span>
                <h2 className="font-display font-bold text-lg text-white">Account Details</h2>
              </div>
              <dl className="space-y-2.5 font-body text-xs">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/10 px-4 py-3">
                  <dt className="text-muted uppercase tracking-wider text-[10px] flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5 text-secondary" /> Handle
                  </dt>
                  <dd className="text-white font-semibold truncate">{user.username}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/10 px-4 py-3">
                  <dt className="text-muted uppercase tracking-wider text-[10px] flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Role
                  </dt>
                  <dd className="text-white font-semibold uppercase">{user.role}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/10 px-4 py-3">
                  <dt className="text-muted uppercase tracking-wider text-[10px] flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-warning" /> Member Since
                  </dt>
                  <dd className="text-white font-semibold">{memberSince}</dd>
                </div>
              </dl>
            </section>

            {/* Security & passphrase */}
            <section className="glass-panel p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <span className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/25 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-warning" />
                </span>
                <h2 className="font-display font-bold text-lg text-white">Security & Passphrase</h2>
              </div>

              {passError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
                  <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-body text-xs text-danger font-medium">{passError}</p>
                    {passDetails.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5">
                        {passDetails.map((d, i) => (
                          <li key={i} className="font-body text-[11px] text-danger/80">{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {passSuccess && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <p className="font-body text-xs text-success font-medium">{passSuccess}</p>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4 font-body text-xs">
                <div>
                  <label htmlFor="curr-pass" className="block text-muted mb-1.5 font-medium">Current Passphrase</label>
                  <SmoothInput
                    id="curr-pass"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={passLoading}
                    autoComplete="current-password"
                    className="text-white"
                    wrapperClassName="bg-void-4 border border-white/10 rounded-xl px-4 py-3 focus-within:border-warning/40"
                  />
                </div>

                <div>
                  <label htmlFor="new-pass" className="block text-muted mb-1.5 font-medium">New Passphrase (min 8 chars)</label>
                  <SmoothInput
                    id="new-pass"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={passLoading}
                    autoComplete="new-password"
                    className="text-white"
                    wrapperClassName="bg-void-4 border border-white/10 rounded-xl px-4 py-3 focus-within:border-warning/40"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-pass" className="block text-muted mb-1.5 font-medium">Confirm New Passphrase</label>
                  <SmoothInput
                    id="confirm-pass"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={passLoading}
                    autoComplete="new-password"
                    className="text-white"
                    wrapperClassName="bg-void-4 border border-white/10 rounded-xl px-4 py-3 focus-within:border-warning/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passLoading}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-warning to-amber-600 text-white font-body text-xs font-bold shadow-glow-amber hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {passLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>UPDATING…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>UPDATE PASSPHRASE</span>
                    </>
                  )}
                </button>
                <p className="flex items-center gap-1.5 text-[10px] text-muted">
                  <ShieldCheck className="w-3 h-3 text-success" />
                  For other account changes, contact the administration.
                </p>
              </form>
            </section>
          </div>

          {/* ---- Right column: solved challenges timeline ---- */}
          <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between pb-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-primary" />
                </span>
                <h2 className="font-display font-bold text-lg text-white">Captured Flags</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 font-mono text-[10px] font-bold text-muted">
                {solves.length} {solves.length === 1 ? "solve" : "solves"}
              </span>
            </div>

            {solves.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 mb-2">
                  <Crosshair className="w-6 h-6 text-muted" />
                </span>
                <p className="font-body text-xs text-muted">No flags captured yet.</p>
                <Link
                  href="/challenges"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Browse Active Targets <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <ol className="relative mt-2">
                <i aria-hidden className="absolute left-[9px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/40 via-white/10 to-transparent" />
                {solves.map((s) => (
                  <li key={s.id} className="relative pl-9 py-3.5 group">
                    <span className="absolute left-0 top-5 w-[19px] h-[19px] rounded-full bg-void border-2 border-secondary flex items-center justify-center group-hover:shadow-[0_0_10px_rgba(56,189,248,0.4)] transition-shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    </span>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-display font-bold text-white text-sm truncate">
                          {s.challenge?.title ?? `Challenge #${s.id}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {s.challenge?.category && (
                            <span className={`px-1.5 py-0.5 rounded-md border font-body text-[9px] font-bold uppercase tracking-wider ${catTone(s.challenge.category)}`}>
                              {s.challenge.category}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-muted">
                            <Clock className="w-3 h-3" />
                            {new Date(s.at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-success text-sm shrink-0 bg-success/10 border border-success/20 px-2 py-1 rounded-lg">
                        +{s.points} PTS
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}