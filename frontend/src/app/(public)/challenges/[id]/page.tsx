"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Cpu,
  Key,
  Layers,
  Code,
  Crosshair,
  Skull,
  ExternalLink,
  FileDown,
  FileArchive,
  CheckCircle,
  Clock,
  User,
  Tag,
  ChevronDown,
  Lightbulb,
  Server,
  Shield,
  ShieldCheck,
  Lock,
  Fingerprint,
  Terminal,
  Flag,
  Eye,
  Loader2,
} from "lucide-react";
import { challenges } from "@/data/challenges";
import { api } from "@/lib/api";
import { downloadFromApi } from "@/lib/download";
import {
  PageContainer,
  StatusBadge,
  MetricCard,
  SectionHeader,
  EmptyState,
  fadeUp,
  stagger,
} from "@/components/ui/primitives";
import type { PublicChallenge } from "@cgs-ctf/shared";

type HintItem = {
  id: number;
  cost: number;
  revealed: boolean;
  text: string | null;
};

type DetailChallenge = {
  id: number;
  title: string;
  category: string;
  description: string;
  longDescription: string;
  points: number;
  bloodPoints: number;
  difficulty: "easy" | "medium" | "hard" | "insane";
  solves: number;
  solved: boolean;
  author: string;
  released: string;
  tags: string[];
  instanceUrl?: string;
  assets: { name: string; url: string; type?: string; size?: string }[];
  hints: HintItem[];
  maxAttempts: number | null;
  attemptsUsed: number;
};

function toDetail(c: PublicChallenge): DetailChallenge {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    description: c.description,
    longDescription: c.longDescription || c.description,
    points: c.points,
    bloodPoints: c.bloodPoints,
    difficulty: c.difficulty,
    solves: c.solves,
    solved: c.solved,
    author: c.author || "CGS Operations",
    released: c.released
      ? new Date(c.released).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "—",
    tags: c.tags ?? [],
    assets: c.attachments.map((a) => ({ name: a.name, url: a.url })),
    hints: (c.hints ?? []).map((h) => ({
      id: h.id,
      cost: h.cost,
      revealed: h.revealed,
      text: h.text,
    })),
    maxAttempts: c.maxAttempts,
    attemptsUsed: c.attemptsUsed,
  };
}

function fromStatic(c: (typeof challenges)[number]): DetailChallenge {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    description: c.description,
    longDescription: c.longDescription,
    points: c.points,
    bloodPoints: 0,
    difficulty: c.difficulty,
    solves: c.solves,
    solved: c.solved,
    author: c.author,
    released: c.released,
    tags: c.tags,
    instanceUrl: c.instanceUrl,
    assets: (c.assets ?? []).map((a) => ({ name: a.name, url: a.url })),
    hints: (c.hints ?? []).map((h, i) => ({
      id: i + 1,
      cost: 0,
      revealed: false,
      text: h,
    })),
    maxAttempts: null,
    attemptsUsed: 0,
  };
}

const categoryMeta: Record<string, { chip: string; dot: string; icon: React.ElementType }> = {
  web: { chip: "text-cat-web bg-cat-web/10 border-cat-web/30", dot: "bg-cat-web", icon: Globe },
  pwn: { chip: "text-cat-pwn bg-cat-pwn/10 border-cat-pwn/30", dot: "bg-cat-pwn", icon: Cpu },
  crypto: { chip: "text-cat-crypto bg-cat-crypto/10 border-cat-crypto/30", dot: "bg-cat-crypto", icon: Key },
  forensics: { chip: "text-cat-forensics bg-cat-forensics/10 border-cat-forensics/30", dot: "bg-cat-forensics", icon: Layers },
  reversing: { chip: "text-cat-reversing bg-cat-reversing/10 border-cat-reversing/30", dot: "bg-cat-reversing", icon: Code },
  osint: { chip: "text-cat-osint bg-cat-osint/10 border-cat-osint/30", dot: "bg-cat-osint", icon: Crosshair },
};

const difficultyMeta: Record<string, { label: string; dot: string; text: string }> = {
  easy: { label: "Easy", dot: "bg-diff-easy", text: "text-diff-easy" },
  medium: { label: "Medium", dot: "bg-diff-medium", text: "text-diff-medium" },
  hard: { label: "Hard", dot: "bg-diff-hard", text: "text-diff-hard" },
  insane: { label: "Insane", dot: "bg-diff-insane", text: "text-diff-insane" },
};

const DIFF_LEVELS = ["easy", "medium", "hard", "insane"] as const;

function ChallengeNotFound() {
  return (
    <PageContainer className="pt-36 pb-24">
      <EmptyState
        icon={Skull}
        title="Target Not Found"
        description="No challenge exists for this target identifier. The node may have been decommissioned."
        action={
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep text-white text-xs font-body font-bold shadow-glow-red hover:brightness-110 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to the Arena
          </Link>
        }
      />
    </PageContainer>
  );
}

function ChallengeDetail({ challenge }: { challenge: DetailChallenge }) {
  const [hintsOpen, setHintsOpen] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [hintState, setHintState] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(challenge.hints.filter((h) => h.revealed).map((h) => [h.id, true]))
  );
  const [hintContents, setHintContents] = useState<Record<number, string>>(() =>
    Object.fromEntries(challenge.hints.filter((h) => h.revealed && h.text).map((h) => [h.id, h.text!]))
  );
  const [hintBusy, setHintBusy] = useState<number | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const meta = categoryMeta[challenge.category] ?? categoryMeta.web;
  const CategoryIcon = meta.icon;
  const diff = difficultyMeta[challenge.difficulty];
  const diffIndex = DIFF_LEVELS.indexOf(challenge.difficulty);

  const revealHint = async (hint: HintItem) => {
    if (hintState[hint.id] || hintBusy !== null) return;
    // Static/demo data carries plaintext with no backend — reveal locally.
    if (hint.text) {
      setHintContents((prev) => ({ ...prev, [hint.id]: hint.text! }));
      setHintState((prev) => ({ ...prev, [hint.id]: true }));
      return;
    }
    setHintBusy(hint.id);
    setHintError(null);
    try {
      const res = await api.post(`/challenges/${challenge.id}/hint/${hint.id}`);
      const content = res.data?.hint?.content as string | undefined;
      if (!content) throw new Error("Empty hint payload");
      setHintContents((prev) => ({ ...prev, [hint.id]: content }));
      setHintState((prev) => ({ ...prev, [hint.id]: true }));
    } catch (err) {
      setHintError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          "Could not reveal hint. Try again."
      );
    } finally {
      setHintBusy(null);
    }
  };

  const downloadAsset = async (asset: { name: string; url: string }) => {
    if (downloading !== null) return;
    setDownloading(asset.name);
    try {
      await downloadFromApi(api, asset.url, asset.name);
    } catch {
      setHintError("Could not download the artifact. Try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <PageContainer className="pt-36 pb-28">
      {/* Back */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <Link
          href="/challenges"
          className="inline-flex items-center gap-2 font-body text-[11px] font-semibold tracking-[0.14em] uppercase text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Target Arena
        </Link>
      </motion.div>

      {/* ============ HERO — INTELLIGENCE BRIEFING ============ */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mt-6 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-transparent to-white/[0.02] shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
      >
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full blur-[110px]" style={{ background: "rgba(255,23,68,0.12)" }} />
          <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full blur-[110px]" style={{ background: "rgba(0,180,255,0.12)" }} />
          <div className="cgs-grid absolute inset-0 opacity-60" />
        </div>

        <div className="relative grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10 p-6 sm:p-10 lg:p-14">
          {/* LEFT — briefing */}
          <motion.div variants={fadeUp} className="space-y-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${meta.chip}`}>
                <CategoryIcon className="w-3 h-3" />
                {challenge.category}
              </span>
              <span className={`inline-flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03] text-muted`}>
                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                {diff.label}
              </span>
              {challenge.solved ? (
                <StatusBadge tone="success">
                  <CheckCircle className="w-3 h-3" />
                  Solved
                </StatusBadge>
              ) : (
                <StatusBadge tone="warning" pulse>
                  <Eye className="w-3 h-3" />
                  Unsolved
                </StatusBadge>
              )}
            </div>

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.02]">
              {challenge.title}
            </h1>

            <p className="font-body text-sm sm:text-base text-ink-2 leading-relaxed max-w-2xl">
              {challenge.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <MetricCard label="Points" value={challenge.points} icon={Flag} accent="text-primary" />
              <MetricCard
                label="Blood Bonus"
                value={`+${challenge.bloodPoints}`}
                icon={Skull}
                accent="text-primary"
              />
              <MetricCard label="Solves" value={challenge.solves} icon={Crosshair} accent="text-secondary" />
              <MetricCard label="Author" value={challenge.author} icon={User} accent="text-cat-crypto" />
              <MetricCard label="Released" value={challenge.released} icon={Clock} accent="text-success" />
              <MetricCard
                label="Attempts"
                value={`${challenge.attemptsUsed}${challenge.maxAttempts != null ? `/${challenge.maxAttempts}` : ""}`}
                icon={Eye}
                accent="text-warning"
              />
            </div>

            {challenge.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-muted" />
                {challenge.tags.map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/10 font-mono text-[11px] text-muted">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* RIGHT — MISSION STATUS console */}
          <motion.div variants={fadeUp} className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-void-3/80 backdrop-blur-xl">
              <div aria-hidden className="cgs-scanline" />
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    Mission Status
                  </span>
                </div>
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
              </div>

              <div className="p-5 space-y-5 font-body">
                {/* State */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-2">State</span>
                  <StatusBadge tone={challenge.solved ? "success" : "warning"}>
                    {challenge.solved ? "Captured" : "Active"}
                  </StatusBadge>
                </div>

                {/* Difficulty gauge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-2">Difficulty</span>
                    <span className={`text-xs font-bold ${diff.text}`}>{diff.label}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {DIFF_LEVELS.map((lvl, i) => (
                      <div
                        key={lvl}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                          i <= diffIndex ? diff.dot : "bg-white/[0.07]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Completion */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-2">Completion</span>
                    <span className="font-mono text-xs text-white">{challenge.solves} solves</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(4, challenge.solves))}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                    />
                  </div>
                </div>

                {/* Target status */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-2">Target Status</span>
                  {challenge.instanceUrl ? (
                    <span className="inline-flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-wider text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-wider text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                      Static
                    </span>
                  )}
                </div>

                {/* Integrity footer */}
                <div className="pt-3 border-t border-white/10 flex items-center gap-2 font-mono text-[10px] text-success/80">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  sha256: {challenge.id.toString().padStart(8, "0")}···verified
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ============ ACTION BAR (sticky, desktop) ============ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:block sticky bottom-5 z-30 mt-8"
      >
        <div className="mx-auto max-w-fit rounded-2xl border border-white/10 bg-void/90 backdrop-blur-2xl px-3 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center gap-2">
          {challenge.instanceUrl && (
            <a
              href={challenge.instanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-body text-xs font-bold uppercase tracking-[0.14em] bg-gradient-to-r from-primary via-primary-glow to-secondary-deep shadow-[0_8px_28px_rgba(255,23,68,0.3)] hover:-translate-y-0.5 hover:brightness-110 transition-all duration-300"
            >
              <span aria-hidden className="cgs-sweep" />
              <span className="relative z-10 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Launch Target
              </span>
            </a>
          )}
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-secondary/40 bg-secondary/10 text-secondary font-body text-xs font-bold uppercase tracking-[0.14em] hover:bg-secondary/15 hover:shadow-glow-blue hover:-translate-y-0.5 transition-all duration-300"
          >
            <Flag className="w-4 h-4" />
            Submit Flag
          </Link>
          <button
            type="button"
            onClick={() => setHintsOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-muted font-body text-xs font-bold uppercase tracking-[0.14em] hover:text-white hover:bg-white/[0.06] transition-all duration-300"
          >
            <Lightbulb className="w-4 h-4 text-warning" />
            {hintsOpen ? "Hide Hints" : "View Hints"}
          </button>
        </div>
      </motion.div>

      {/* ============ CONTENT GRID ============ */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* LEFT column */}
        <div className="lg:col-span-2 space-y-6">
          {/* MISSION BRIEFING */}
          <motion.div variants={fadeUp} className="cgs-card p-6 sm:p-8 space-y-5">
            <SectionHeader kicker="Intelligence" title="Mission Briefing" icon={Shield} />
            <p className="font-body text-sm text-ink-2 leading-relaxed">
              {challenge.longDescription}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/[0.07]">
              {[
                { icon: ShieldCheck, label: "Payload Verified" },
                { icon: Fingerprint, label: "SHA-256 Verified" },
                { icon: Lock, label: "Secure Artifact" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/20 bg-success/[0.06] font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-success/90"
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* TACTICAL HINTS — intelligence panel */}
          <motion.div variants={fadeUp} className="cgs-card overflow-hidden">
            <button
              type="button"
              onClick={() => setHintsOpen((v) => !v)}
              aria-expanded={hintsOpen}
              className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-warning/15 to-primary/15 border border-white/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-warning" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-white">Tactical Hints</h2>
                  <p className="font-body text-[10px] text-muted-2 uppercase tracking-[0.18em]">
                    {Object.keys(hintState).length} / {challenge.hints.length} revealed
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-300 ${hintsOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {hintsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-2.5">
                    {challenge.hints.map((hint, i) => {
                      const revealed = hintState[hint.id] === true;
                      const busy = hintBusy === hint.id;
                      const content = hintContents[hint.id];
                      return (
                        <motion.div
                          key={hint.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => void revealHint(hint)}
                            disabled={busy}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left group disabled:opacity-60 disabled:cursor-wait"
                          >
                            <span className="shrink-0 font-mono text-[10px] font-bold text-warning bg-warning/10 border border-warning/25 rounded-md px-1.5 py-0.5">
                              HINT-{String(i + 1).padStart(2, "0")}
                            </span>
                            {revealed ? (
                              <span className="shrink-0 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-success">
                                {busy ? "Decrypting…" : "Unlocked"}
                              </span>
                            ) : (
                              <span className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-muted group-hover:text-white transition-colors truncate">
                                {busy ? "Decrypting payload…" : "Classified — click to reveal"}
                              </span>
                            )}
                            <span className="ml-auto shrink-0 inline-flex items-center gap-1 font-body text-[10px] text-muted-2">
                              <Lock className="w-3 h-3" />
                              {hint.cost > 0 ? `${hint.cost} pts` : "free"}
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {(revealed && content) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <p className="px-4 pb-3.5 font-body text-xs text-ink-2 leading-relaxed">
                                  {content}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                    {hintError && (
                      <p className="font-body text-[10px] text-primary font-semibold px-1 pt-1">{hintError}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* RIGHT column */}
        <div className="space-y-6">
          {/* TARGET INSTANCE — operational console */}
          <motion.div variants={fadeUp} className="cgs-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-secondary" />
                <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  Target Instance
                </span>
              </div>
              {challenge.instanceUrl ? (
                <span className="inline-flex items-center gap-1.5 font-body text-[9px] font-bold uppercase tracking-wider text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-body text-[9px] font-bold uppercase tracking-wider text-muted-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-2" />
                  Static
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {challenge.instanceUrl ? (
                <>
                  <a
                    href={challenge.instanceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative overflow-hidden w-full inline-flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl text-white font-body text-xs font-bold uppercase tracking-[0.16em] bg-gradient-to-r from-primary via-primary-glow to-secondary-deep shadow-[0_12px_36px_rgba(255,23,68,0.3)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_44px_rgba(0,180,255,0.35)] transition-all duration-300"
                  >
                    <span aria-hidden className="cgs-sweep" />
                    <span className="relative z-10 flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      Launch Target
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </a>

                  <div className="rounded-xl border border-white/[0.07] bg-void-3/70 px-4 py-3 space-y-1.5">
                    <p className="font-body text-[9px] text-muted-2 uppercase tracking-[0.2em]">Endpoint</p>
                    <a
                      href={challenge.instanceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-[11px] text-secondary hover:text-secondary-light break-all transition-colors"
                    >
                      {challenge.instanceUrl}
                    </a>
                  </div>

                  <div className="flex items-center justify-between font-body text-[10px] text-muted-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Persistence: 2h after first launch
                    </span>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Server}
                  title="Static Challenge"
                  description="No remote instance is required — every artifact needed to capture this flag ships with the download bundle."
                />
              )}
            </div>
          </motion.div>

          {/* AVAILABLE ARTIFACTS — asset terminal */}
          <motion.div variants={fadeUp} className="cgs-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <FileArchive className="w-3.5 h-3.5 text-warning" />
                <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  Available Artifacts
                </span>
              </div>
              {challenge.assets && challenge.assets.length > 0 && (
                <span className="font-mono text-[10px] text-muted-2">
                  {challenge.assets.length} file{challenge.assets.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="p-5 space-y-2.5">
              {challenge.assets && challenge.assets.length > 0 ? (
                challenge.assets.map((asset) => (
                  <div
                    key={asset.name}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-void-3/60 px-4 py-3 transition-all duration-300 hover:border-secondary/40 hover:shadow-glow-blue"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-warning/15 to-secondary/15 border border-white/10 flex items-center justify-center shrink-0">
                        <FileArchive className="w-4 h-4 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-white truncate">{asset.name}</p>
                        <p className="font-body text-[9px] text-muted-2 uppercase tracking-[0.14em]">
                          {asset.type ?? "FILE"}{asset.size ? ` · ${asset.size}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void downloadAsset(asset)}
                      disabled={downloading !== null}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-secondary/40 bg-secondary/10 text-secondary font-body text-[10px] font-bold uppercase tracking-wider transition-all duration-300 hover:bg-secondary/20 hover:shadow-glow-blue hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait"
                    >
                      {downloading === asset.name ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                      Download
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={FileArchive}
                  title="No Artifacts"
                  description="All required material is served by the remote target instance — nothing to download."
                />
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile action bar */}
      <div className="md:hidden mt-8 grid grid-cols-2 gap-2.5">
        {challenge.instanceUrl && (
          <a
            href={challenge.instanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-white font-body text-[11px] font-bold uppercase tracking-[0.12em] bg-gradient-to-r from-primary via-primary-glow to-secondary-deep"
          >
            <span aria-hidden className="cgs-sweep" />
            <span className="relative z-10 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              Launch
            </span>
          </a>
        )}
        <Link
          href="/submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-secondary/40 bg-secondary/10 text-secondary font-body text-[11px] font-bold uppercase tracking-[0.12em]"
        >
          <Flag className="w-3.5 h-3.5" />
          Submit Flag
        </Link>
      </div>
    </PageContainer>
  );
}

export default function ChallengePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [challenge, setChallenge] = useState<DetailChallenge | null | undefined>(undefined);
  const [loading, setLoading] = useState(Number.isFinite(id));

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setChallenge(undefined);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    api
      .get(`/challenges/${id}`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.challenge as PublicChallenge | undefined;
        if (data) {
          setChallenge(toDetail(data));
        } else {
          const staticMatch = challenges.find((c) => c.id === id);
          setChallenge(staticMatch ? fromStatic(staticMatch) : undefined);
        }
      })
      .catch(() => {
        if (!mounted) return;
        const staticMatch = challenges.find((c) => c.id === id);
        setChallenge(staticMatch ? fromStatic(staticMatch) : undefined);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PageContainer className="pt-36 pb-24 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="font-body text-xs text-muted">Pulling target intelligence…</p>
        </div>
      </PageContainer>
    );
  }

  return challenge ? <ChallengeDetail challenge={challenge} /> : <ChallengeNotFound />;
}
