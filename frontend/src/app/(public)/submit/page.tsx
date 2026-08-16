"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Flag,
  XCircle,
  Loader2,
  Shield,
  Zap,
  Trophy,
  Lock,
  Fingerprint,
  History,
  AlertTriangle,
  ScanLine,
  Timer,
  ChevronDown,
  Target,
  Lightbulb,
  Terminal,
  Skull,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import type { PublicChallenge } from "@cgs-ctf/shared";
import { challenges as staticTargets } from "@/data/challenges";
import { PageContainer, PageHeader, StatusBadge, SecurityStrip, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/stateful-button";
import { deployContainer, deployItem } from "@/lib/motion";
import { SmoothInput } from "@/components/ui/input";

type SubmitResult = {
  kind: "correct" | "incorrect" | "already_solved" | "max_attempts" | "invalid_format" | "rate_limited" | "killed" | "locked" | "error";
  message: string;
  points?: number;
  bloodPoints?: number;
  firstBlood?: boolean;
  remainingAttempts?: number;
  retryAfterSeconds?: number;
};

type HistoryEntry = {
  id: number;
  title: string;
  kind: SubmitResult["kind"];
  points?: number;
  at: string;
};

const kindMeta: Record<string, { label: string; tone: "success" | "danger" | "warning" | "muted" }> = {
  correct: { label: "Verified", tone: "success" },
  incorrect: { label: "Invalid", tone: "danger" },
  already_solved: { label: "Already Solved", tone: "warning" },
  max_attempts: { label: "Attempts Exhausted", tone: "danger" },
  invalid_format: { label: "Bad Format", tone: "warning" },
  rate_limited: { label: "Rate Limited", tone: "danger" },
  killed: { label: "Submissions Killed", tone: "danger" },
  locked: { label: "Competition Locked", tone: "warning" },
  error: { label: "Error", tone: "muted" },
};

const STATIC_TARGETS: PublicChallenge[] = staticTargets.map((c) => ({
  id: c.id,
  title: c.title,
  category: c.category as PublicChallenge["category"],
  description: c.description,
  longDescription: c.longDescription,
  points: c.points,
  bloodPoints: c.points,
  difficulty: c.difficulty,
  solves: c.solves,
  solved: c.solved,
  maxAttempts: null,
  attemptsUsed: 0,
  attachments: (c.assets ?? []).map((a) => ({ name: a.name, url: a.url })),
  hints: c.hints.map((h, i) => ({ id: i + 1, cost: 0, revealed: false, text: h })),
  tags: c.tags,
  author: c.author,
  released: c.released,
}));

export default function SubmitFlagPage() {
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flag, setFlag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [shake, setShake] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (cooldownUntil === null) return;
    const t = setInterval(() => {
      const now = Date.now();
      if (now >= cooldownUntil) {
        setCooldownUntil(null);
        setResult(null);
      } else {
        setNowTick(now);
      }
    }, 500);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const cooldownSeconds = cooldownUntil !== null ? Math.max(0, Math.ceil((cooldownUntil - nowTick) / 1000)) : 0;

  useEffect(() => {
    let mounted = true;
    const applyTargets = (list: PublicChallenge[]) => {
      setChallenges(list);
      if (list.length > 0) {
        setSelectedId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0].id));
      }
    };
    api
      .get("/challenges")
      .then((res) => {
        if (!mounted) return;
        const list: PublicChallenge[] = res.data.challenges ?? [];
        applyTargets(list.length > 0 ? list : STATIC_TARGETS);
      })
      .catch(() => {
        if (mounted) applyTargets(STATIC_TARGETS);
      })
      .finally(() => {
        if (mounted) setLoadingChallenges(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selected = challenges.find((c) => c.id === selectedId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !flag.trim()) return;
    setSubmitting(true);
    setResult(null);
    setShake(false);

    try {
      const res = await api.post(`/challenges/${selectedId}/submit`, { flag: flag.trim() });
      const data = res.data;
      let r: SubmitResult;
      if (data.result === "correct") {
        r = {
          kind: "correct",
          message: data.message,
          points: data.points,
          bloodPoints: typeof data.bloodPoints === "number" ? data.bloodPoints : undefined,
          firstBlood: data.firstBlood,
        };
      } else if (data.result === "incorrect") {
        r = { kind: "incorrect", message: data.message, remainingAttempts: data.remainingAttempts };
        setShake(true);
      } else if (data.result === "already_solved") {
        r = { kind: "already_solved", message: data.message };
      } else if (data.result === "max_attempts") {
        r = { kind: "max_attempts", message: data.message };
        setShake(true);
      } else if (data.result === "invalid_format") {
        r = { kind: "invalid_format", message: data.message };
        setShake(true);
      } else {
        r = { kind: "error", message: "Unexpected response from the verification server." };
        setShake(true);
      }
      setResult(r);
      setHistory((prev) => [
        {
          id: Date.now(),
          title: selected?.title ?? `Target #${selectedId}`,
          kind: r.kind,
          points: r.points,
          at: new Date().toISOString(),
        },
        ...prev,
      ]);
      if (r.kind === "correct") {
        toast.success(
          `Correct flag submitted! +${r.points} PTS${r.firstBlood && r.bloodPoints ? ` +${r.bloodPoints} BP` : ""}${r.firstBlood ? " — FIRST BLOOD!" : ""}`,
          { duration: 6000 }
        );
        setFlag("");
        setChallenges((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, solved: true } : c))
        );
      }
    } catch (err: any) {
      // Guard rejections answer 403/429 with { result: "...", message } —
      // not the standard { error } envelope.
      const rateData = err?.response?.data;
      if (rateData?.result === "rate_limited" && typeof rateData.retryAfterSeconds === "number") {
        setCooldownUntil(Date.now() + rateData.retryAfterSeconds * 1000);
        setResult({
          kind: "rate_limited",
          message: rateData.message ?? "Too many flag submissions — cooling down.",
          retryAfterSeconds: rateData.retryAfterSeconds,
        });
        setShake(true);
      } else if (rateData?.result === "killed" || rateData?.result === "locked") {
        setResult({
          kind: rateData.result,
          message: rateData.message ?? "Flag submissions are temporarily unavailable.",
        });
        setShake(true);
      } else {
        const msg =
          err?.response?.data?.error?.message ??
          "Submission failed. Check the challenge target and try again.";
        setResult({ kind: "error", message: msg });
        setShake(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validPrefix = useMemo(() => {
    const trimmed = flag.trim();
    return /^CGS\{.+\}$/.test(trimmed);
  }, [flag]);

  const formatInvalid = flag.trim().length > 0 && !validPrefix;

  return (
    <ProtectedRoute>
    <PageContainer className="pt-32 pb-24 space-y-10">
      {/* HERO HEADER */}
      <motion.div
        variants={deployContainer}
        initial="hidden"
        animate="show"
        className="text-center space-y-4"
      >
        <motion.div variants={deployItem}>
          <PageHeader
            eyebrow="Flag Verification Protocol"
            eyebrowIcon={Shield}
            title="SUBMIT"
            gradientWord="TARGET FLAG"
            description="Select a challenge target, provide the extracted CGS{...} flag payload, and trigger constant-time verification."
          />
        </motion.div>
      </motion.div>

      {/* CONSOLE GRID */}
      <motion.div
        variants={deployContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* LEFT — TARGET BRIEFING TERMINAL */}
        <motion.div variants={deployItem} className="lg:col-span-5">
          <div className="cgs-card overflow-hidden shadow-glass-lg">
            <div className="cgs-hairline" />

            <div className="relative">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-void-2/80">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-warning/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary/80" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm text-white">Target Terminal</h2>
                    <p className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">
                      Selected challenge briefing
                    </p>
                  </div>
                </div>
                <Terminal className="w-4 h-4 text-secondary" />
              </div>
              <div aria-hidden className="cgs-scanline" />
            </div>

            {selected && !loadingChallenges ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="p-5 sm:p-6 space-y-5"
              >
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-muted uppercase tracking-[0.2em]">Challenge</p>
                    <p className="font-display font-bold text-base text-white truncate">{selected.title}</p>
                  </div>

                  <p className="font-body text-xs text-ink-2 leading-relaxed">
                    {selected.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/10 bg-void-2/60 px-3 py-2.5">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-2">Score Points</p>
                      <p className="font-mono text-sm font-bold text-secondary">+{selected.points}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-void-2/60 px-3 py-2.5">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-2">Blood Points</p>
                      <p className="font-mono text-sm font-bold text-primary">+{selected.bloodPoints}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-void-2/60 px-3 py-2.5">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-2">Solvers</p>
                      <p className="font-mono text-sm font-bold text-white">{selected.solves}</p>
                    </div>
                  </div>

                  {selected.hints.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-2">
                        <Lightbulb className="w-3 h-3 text-warning" />
                        Tactical Hints
                      </p>
                      {selected.hints.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-void-2/60 px-3 py-2"
                        >
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-warning">
                            <Lock className="w-3 h-3" />
                            HINT-{String(h.id).padStart(2, "0")}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            {h.cost > 0 ? `${h.cost} pts` : "free"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : loadingChallenges ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={Terminal}
                    title="No Target Selected"
                    description="Choose a challenge from the dropdown in the verification console to load its briefing here."
                  />
                </div>
              )}
            </div>
          </motion.div>

        {/* RIGHT — VERIFICATION CONSOLE PANEL */}
        <motion.div variants={deployItem} className="lg:col-span-7">
          <motion.div
            animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="cgs-card overflow-hidden shadow-glass-lg"
          >
            <div className="cgs-hairline" />

            <div className="relative">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-void-2/80">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary radar-pulse" />
                  <span className="font-display font-bold text-xs uppercase tracking-[0.2em] text-white">
                    Flag Verification Console
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Fingerprint className="w-4 h-4 text-secondary" />
                  <span className="font-mono text-[10px] uppercase tracking-wider hidden sm:inline">
                    sha-256 · constant-time
                  </span>
                </div>
              </div>
              <div aria-hidden className="cgs-scanline" />
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Challenge Target Dropdown Selection */}
              <div className="space-y-1.5">
                <label
                  htmlFor="challenge-select"
                  className="flex items-center gap-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-muted"
                >
                  <Target className="w-3.5 h-3.5 text-secondary" />
                  Challenge Target
                </label>
                <div className="relative">
                  <select
                    id="challenge-select"
                    value={selectedId ?? ""}
                    disabled={loadingChallenges || challenges.length === 0}
                    onChange={(e) => {
                      setSelectedId(Number(e.target.value));
                      setResult(null);
                      setShake(false);
                    }}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-void-3/60 pl-4 pr-10 py-3.5 font-mono text-xs text-white transition-all duration-300 focus:border-secondary/60 focus:outline-none focus:shadow-glow-blue disabled:opacity-50"
                  >
                    {challenges.length === 0 ? (
                      <option value="">No targets available</option>
                    ) : (
                      challenges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} — +{c.points} PTS · {c.solves} solves
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                  />
                </div>
              </div>

              {/* Flag Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="flag-input" className="flex items-center justify-between font-body text-xs font-semibold text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Flag className="w-4 h-4 text-primary" />
                      Flag Payload
                    </span>
                    <span className={`font-mono text-xs ${validPrefix ? "text-secondary font-bold" : "text-muted"}`}>
                      CGS{"{...}"} format
                    </span>
                  </label>
                  <div
                    className={`relative rounded-xl border transition-all duration-300 overflow-hidden ${
                      validPrefix
                        ? "border-secondary/60 shadow-glow-blue"
                        : "border-white/10 focus-within:border-secondary/60 focus-within:shadow-glow-blue"
                    }`}
                  >
                    <span aria-hidden className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center border-r border-white/10 bg-white/[0.02]">
                      <ScanLine className="w-4 h-4 text-secondary animate-pulse" />
                    </span>
                    <SmoothInput
                      id="flag-input"
                      type="text"
                      required
                      value={flag}
                      onChange={(e) => {
                        setFlag(e.target.value);
                        setResult(null);
                        setShake(false);
                      }}
                      disabled={!selected || submitting || cooldownUntil !== null}
                      placeholder="CGS{your_extracted_flag_here}"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      className="text-white font-mono text-sm tracking-wide placeholder:text-muted-2"
                      wrapperClassName="bg-void-3/70 pl-14 pr-4 py-4"
                    />
                  </div>
                  {formatInvalid && (
                    <p className="font-body text-[10px] font-semibold text-warning mt-1.5">
                      Payload must match the official format: CGS{"{...}"}
                    </p>
                  )}
                </div>

                {/* 3-State Submit Button */}
                <Button
                  type="submit"
                  className="w-full py-4"
                  disabled={!selected || submitting || !validPrefix || cooldownUntil !== null}
                  loading={submitting}
                  loadingText="VERIFYING PAYLOAD…"
                  success={result?.kind === "correct"}
                  successText="FLAG VERIFIED"
                >
                  {cooldownUntil !== null ? (
                    <>
                      <Timer className="w-4 h-4 text-white" />
                      <span>COOLDOWN — RETRY IN {cooldownSeconds}s</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>VERIFY & SUBMIT FLAG</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Dynamic Feedback Result Banner */}
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    key={result.kind + result.message}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative overflow-hidden rounded-xl border p-5 ${
                      result.kind === "correct"
                        ? "border-secondary/50 bg-secondary/10 shadow-glow-blue"
                        : result.kind === "already_solved" || result.kind === "invalid_format"
                        ? "border-warning/50 bg-warning/10 shadow-glow-amber"
                        : "border-primary/50 bg-primary/10 shadow-glow-red"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          result.kind === "correct"
                            ? "border-secondary/40 bg-secondary/20 text-secondary"
                            : result.kind === "already_solved" || result.kind === "invalid_format"
                            ? "border-warning/40 bg-warning/20 text-warning"
                            : "border-primary/40 bg-primary/20 text-primary"
                        }`}
                      >
                        {result.kind === "correct" ? (
                          <Trophy className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <p
                          className={`font-display font-bold text-sm ${
                            result.kind === "correct"
                              ? "text-secondary"
                              : result.kind === "already_solved" || result.kind === "invalid_format"
                              ? "text-warning"
                              : "text-primary"
                          }`}
                        >
                          {result.kind === "correct"
                            ? "Flag Payload Verified"
                            : result.kind === "incorrect"
                            ? "Invalid Flag Payload"
                            : result.kind === "already_solved"
                            ? "Already Solved"
                            : result.kind === "invalid_format"
                            ? "Malformed Payload"
                            : result.kind === "rate_limited"
                            ? "Submission Blocked — Cooling Down"
                            : "Verification Failed"}
                        </p>
                        <p className="font-body text-xs text-ink-2 leading-relaxed">{result.message}</p>
                        {result.kind === "correct" && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary/20 border border-secondary/40 font-mono text-xs font-bold text-secondary">
                              <Zap className="w-3.5 h-3.5" />
                              +{result.points} PTS
                            </span>
                            {result.firstBlood && (
                              <>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/20 border border-primary/40 font-mono text-xs font-bold text-primary">
                                  <Skull className="w-3.5 h-3.5" />
                                  +{result.bloodPoints ?? 0} BP
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/20 border border-primary/40 font-body text-[10px] font-bold uppercase tracking-wider text-primary">
                                  <Trophy className="w-3.5 h-3.5" />
                                  FIRST BLOOD!
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Security Strip with Signal Blue Ticks */}
          <div className="mt-6">
            <SecurityStrip
              items={[
                { label: "Flags Hash Verified", icon: Fingerprint },
                { label: "Constant-Time Comparison", icon: Lock },
                { label: "Rate Limited", icon: Timer },
                { label: "Attempts Recorded", icon: History },
              ]}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* RECENT SUBMISSIONS PANEL */}
      <motion.div variants={deployItem} initial="hidden" animate="show" className="mt-8">
        <div className="cgs-card overflow-hidden shadow-glass-lg">
          <div className="cgs-hairline" />

          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-void-2/80">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-secondary" />
              <h2 className="font-display font-bold text-sm text-white">Recent Submissions</h2>
            </div>
            <StatusBadge tone="muted">{history.length} This Session</StatusBadge>
          </div>

          {history.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="No Submissions Yet"
                description="Submit your first flag — every verification attempt is recorded here with its outcome."
              />
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-white/[0.02] transition-colors relative">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      kindMeta[h.kind].tone === "success" ? "bg-secondary" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-xs text-white truncate">{h.title}</p>
                    <p className="font-mono text-[10px] text-muted-2 uppercase tracking-wider">
                      {new Date(h.at).toLocaleTimeString()}
                    </p>
                  </div>
                  {h.points !== undefined && (
                    <span className="shrink-0 font-mono text-xs font-bold text-secondary">+{h.points} PTS</span>
                  )}
                  <StatusBadge tone={kindMeta[h.kind].tone} className="max-[420px]:hidden">{kindMeta[h.kind].label}</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Security Compliance Audit Note */}
      <p className="flex items-center justify-center gap-2 font-body text-xs text-muted uppercase tracking-[0.2em] pt-4">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <span>All verification attempts are recorded and logged against your account</span>
      </p>
    </PageContainer>
    </ProtectedRoute>
  );
}
