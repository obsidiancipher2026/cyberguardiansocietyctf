"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Shield,
  CheckCircle2,
  ArrowUpRight,
  FileDown,
  Server,
  Target,
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  SearchX,
  Loader2,
} from "lucide-react";
import { challenges as defaultChallenges } from "@/data/challenges";
import { api } from "@/lib/api";
import { downloadFromApi } from "@/lib/download";
import { DomainBadge, AnimatedNumber, StatusBadge } from "@/components/ui/primitives";
import { deployContainer, deployItem } from "@/lib/motion";
import { SmoothInput } from "@/components/ui/input";
import type { PublicChallenge } from "@cgs-ctf/shared";

const difficultyMeta: Record<string, { badge: string; dot: string }> = {
  easy: { badge: "text-secondary border-secondary/30 bg-secondary/10", dot: "bg-secondary" },
  medium: { badge: "text-warning border-warning/30 bg-warning/10", dot: "bg-warning" },
  hard: { badge: "text-orange-500 border-orange-500/30 bg-orange-500/10", dot: "bg-orange-500" },
  insane: { badge: "text-primary border-primary/40 bg-primary/10 radar-pulse", dot: "bg-primary" },
};

const catMeta: Record<string, { label: string; dot: string; text: string }> = {
  web: { label: "Web", dot: "bg-secondary", text: "text-secondary" },
  pwn: { label: "Pwn", dot: "bg-primary", text: "text-primary" },
  crypto: { label: "Crypto", dot: "bg-violet", text: "text-violet" },
  forensics: { label: "Forensics", dot: "bg-secondary", text: "text-secondary" },
  reversing: { label: "Reversing", dot: "bg-primary", text: "text-primary" },
  osint: { label: "OSINT", dot: "bg-secondary", text: "text-secondary" },
  misc: { label: "Misc", dot: "bg-violet", text: "text-violet" },
};

const DIFFICULTIES = ["easy", "medium", "hard", "insane"] as const;
const STATUSES = [
  { key: "all", label: "All" },
  { key: "solved", label: "Solved" },
  { key: "open", label: "Open" },
] as const;

type StatusKey = (typeof STATUSES)[number]["key"];

function toggleIn(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

type Target = {
  id: number;
  title: string;
  category: string;
  description: string;
  points: number;
  difficulty: string;
  solves: number;
  solved: boolean;
  instanceUrl?: string;
  assets: { name: string; url: string }[];
};

function toTarget(c: PublicChallenge): Target {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    description: c.description,
    points: c.points,
    difficulty: c.difficulty,
    solves: c.solves,
    solved: c.solved,
    assets: c.attachments.map((a) => ({ name: a.name, url: a.url })),
  };
}

const STATIC_TARGETS: Target[] = defaultChallenges.map((c) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  description: c.description,
  points: c.points,
  difficulty: c.difficulty,
  solves: c.solves,
  solved: c.solved,
  instanceUrl: c.instanceUrl,
  assets: (c.assets ?? []).map((a) => ({ name: a.name, url: a.url })),
}));

export default function ChallengesPage() {
  const [targets, setTargets] = useState<Target[]>(STATIC_TARGETS);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [diffs, setDiffs] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusKey>("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const downloadAll = async (id: number, assets: { name: string; url: string }[]) => {
    if (downloadingId !== null || assets.length === 0) return;
    setDownloadingId(id);
    try {
      for (const asset of assets) {
        await downloadFromApi(api, asset.url, asset.name);
      }
    } catch {
      // Individual downloads fail silently; a toast would be nicer but this
      // component deliberately avoids toast to stay dependency-light.
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    api
      .get("/challenges")
      .then((res) => {
        if (!mounted) return;
        const list: PublicChallenge[] = res.data?.challenges ?? [];
        setTargets(list.map(toTarget));
        setLive(true);
      })
      .catch(() => {
        // Keep demo targets as fallback when the API is unreachable
      });
    return () => {
      mounted = false;
    };
  }, []);

  const solvedCount = targets.filter((c) => c.solved).length;
  const openCount = targets.length - solvedCount;
  const totalPoints = targets.reduce((sum, c) => sum + c.points, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return targets.filter(
      (c) =>
        (q === "" ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)) &&
        (cats.length === 0 || cats.includes(c.category)) &&
        (diffs.length === 0 || diffs.includes(c.difficulty)) &&
        (status === "all" ? true : status === "solved" ? c.solved : !c.solved)
    );
  }, [targets, query, cats, diffs, status]);

  const catCounts = useMemo(
    () =>
      targets.reduce<Record<string, number>>((acc, c) => {
        acc[c.category] = (acc[c.category] ?? 0) + 1;
        return acc;
      }, {}),
    [targets]
  );

  const diffCounts = useMemo(
    () =>
      targets.reduce<Record<string, number>>((acc, c) => {
        acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1;
        return acc;
      }, {}),
    [targets]
  );

  const activeCount =
    (query.trim() ? 1 : 0) + cats.length + diffs.length + (status !== "all" ? 1 : 0);

  const resetFilters = () => {
    setQuery("");
    setCats([]);
    setDiffs([]);
    setStatus("all");
  };

  const filtersEl = (
    <FiltersContent
      query={query}
      setQuery={setQuery}
      cats={cats}
      setCats={setCats}
      diffs={diffs}
      setDiffs={setDiffs}
      status={status}
      setStatus={setStatus}
      resetFilters={resetFilters}
      activeCount={activeCount}
      catCounts={catCounts}
      diffCounts={diffCounts}
      shown={filtered.length}
      total={targets.length}
    />
  );

  return (
    <ProtectedRoute>
      <div className="pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header + Duotone Stat Cluster */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-body font-semibold text-primary relative overflow-hidden">
              <Shield className="w-3.5 h-3.5" />
              <span>ACTIVE WARFARE ARENA</span>
              <span aria-hidden className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-secondary" />
            </div>
            <StatusBadge tone={live ? "danger" : "muted"} pulse={live}>
              {live ? "LIVE TELEMETRY" : "DEMO DATA"}
            </StatusBadge>
            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
              TARGET <span className="text-gradient-cgs">CHALLENGES</span>
            </h1>
            <p className="font-body text-xs text-muted">
              Click a target node to open its full operational briefing, launch isolated containers, or grab assets.
            </p>
          </div>

          {/* Duotone Stat Cluster */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto max-w-full">
            <div className="px-4 py-3 rounded-2xl border border-white/10 bg-void-2/80 text-center space-y-0.5 min-w-0">
              <span className="block font-display font-black text-lg text-white">
                <AnimatedNumber value={targets.length} />
              </span>
              <span className="font-body text-[9px] text-muted uppercase tracking-wider">Targets</span>
            </div>

            <div className="px-4 py-3 rounded-2xl border border-secondary/30 bg-secondary/10 text-center space-y-0.5 min-w-0">
              <span className="block font-display font-black text-lg text-secondary">
                <AnimatedNumber value={solvedCount} />
              </span>
              <span className="font-body text-[9px] text-secondary uppercase tracking-wider font-semibold">Solved</span>
            </div>

            <div className="px-4 py-3 rounded-2xl border border-primary/30 bg-primary/10 text-center space-y-0.5 min-w-0">
              <span className="block font-display font-black text-lg text-primary">
                <AnimatedNumber value={openCount} />
              </span>
              <span className="font-body text-[9px] text-primary uppercase tracking-wider font-semibold">Open</span>
            </div>

            <div className="px-4 py-3 rounded-2xl border border-white/10 bg-void-2/80 text-center space-y-0.5 min-w-0">
              <span className="block font-display font-black text-lg text-gradient-cgs">
                <AnimatedNumber value={totalPoints} />
              </span>
              <span className="font-body text-[9px] text-muted uppercase tracking-wider">Total PTS</span>
            </div>
          </div>
        </div>

        {/* Mobile filter toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="w-full inline-flex items-center justify-between gap-3 px-4 py-3 rounded-2xl glass-panel border border-white/10 text-xs font-body font-semibold text-white transition-colors hover:border-primary/30"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filters
            </span>
            <span className="flex items-center gap-2">
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[9px] font-bold">
                  {activeCount}
                </span>
              )}
              <span className={`text-muted ${mobileOpen ? "rotate-180" : ""} transition-transform`}>
                <ChevronArrow />
              </span>
            </span>
          </button>
          <AnimatePresence initial={false}>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-3">{filtersEl}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-7 items-start">
          {/* Desktop filter sidebar */}
          <aside className="hidden lg:block lg:sticky lg:top-28">{filtersEl}</aside>

          {/* Challenge Cards */}
          <div>
            {filtered.length === 0 ? (
              <div className="glass-panel rounded-2xl border border-white/10 p-14 text-center relative overflow-hidden">
                <i aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-violet to-secondary" />
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                  <SearchX className="w-6 h-6 text-primary" />
                </span>
                <h3 className="font-display font-black text-lg text-white">NO TARGETS MATCH</h3>
                <p className="font-body text-xs text-muted mt-1.5 max-w-sm mx-auto">
                  No challenges match the current filters. Widen your search or reset the panel.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep text-white text-xs font-body font-bold shadow-glow-red hover:brightness-110 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              </div>
            ) : (
              <motion.div
                variants={deployContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                {filtered.map((ch) => {
                  const diff = difficultyMeta[ch.difficulty] ?? difficultyMeta.easy;

                  return (
                    <motion.div key={ch.id} variants={deployItem}>
                      <div
                        className={`cgs-card rounded-2xl border flex flex-col h-full overflow-hidden group charge-hover relative transition-all duration-300 ${
                          ch.solved
                            ? "border-secondary/40 bg-secondary/5 hover:shadow-glow-blue"
                            : "border-white/10 hover:border-primary/40 hover:shadow-glow-red"
                        }`}
                      >
                        <Link
                          href={`/challenges/${ch.id}`}
                          className="flex-1 flex flex-col p-6"
                        >
                          <div className="space-y-3 relative z-10">
                            {/* Top Bar: Category Pill & Solved Checkmark */}
                            <div className="flex items-center justify-between">
                              <DomainBadge category={ch.category} />

                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-lg text-white">
                                  {ch.points}
                                  <span className="text-xs font-normal text-muted"> PTS</span>
                                </span>
                                {ch.solved && (
                                  <div className="w-6 h-6 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary shadow-glow-blue">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Title & Arrow Hover Glyph */}
                            <h3 className="font-display font-bold text-lg text-white group-hover:text-white transition-colors flex items-center justify-between gap-2 leading-snug">
                              <span className="truncate">{ch.title}</span>
                              <ArrowUpRight className="w-4 h-4 shrink-0 text-secondary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                            </h3>

                            <p className="font-body text-xs text-muted leading-relaxed line-clamp-2">
                              {ch.description}
                            </p>
                          </div>
                        </Link>

                        {/* Footer Bar: Solves, Difficulty Tier, Asset Button */}
                        <div className="px-6 pt-3 pb-5 border-t border-white/10 flex items-center justify-between font-body text-xs text-muted relative z-10">
                          <span className="font-mono text-[11px] text-muted">{ch.solves} solves</span>

                          {/* Difficulty Tag */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-body text-[10px] font-bold capitalize ${diff.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                            {ch.difficulty}
                          </span>

                          {/* Provision / Asset Action */}
                          {ch.instanceUrl ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/15 border border-secondary/40 text-secondary font-mono text-[10px] font-bold uppercase tracking-wider">
                              <Server className="w-3 h-3" />
                              <span>Instance</span>
                            </span>
                          ) : ch.assets && ch.assets.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void downloadAll(ch.id, ch.assets);
                              }}
                              disabled={downloadingId !== null}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/15 border border-secondary/40 text-secondary font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-300 hover:bg-secondary/25 hover:shadow-glow-blue disabled:opacity-60 disabled:cursor-wait"
                            >
                              {downloadingId === ch.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <FileDown className="w-3 h-3" />
                              )}
                              <span>Download Assets</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-muted font-mono text-[10px] font-bold uppercase tracking-wider">
                              <FileDown className="w-3 h-3" />
                              <span>0 Assets</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Audit Guarantee */}
        <p className="flex items-center justify-center gap-2 font-body text-xs text-muted uppercase tracking-[0.2em] pt-4">
          <Target className="w-4 h-4 text-secondary radar-pulse" />
          <span>All target vectors verified — flag integrity hash-checked</span>
        </p>
      </div>
    </ProtectedRoute>
  );
}

function ChevronArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FiltersContent({
  query,
  setQuery,
  cats,
  setCats,
  diffs,
  setDiffs,
  status,
  setStatus,
  resetFilters,
  activeCount,
  catCounts,
  diffCounts,
  shown,
  total,
}: {
  query: string;
  setQuery: (v: string) => void;
  cats: string[];
  setCats: (list: string[]) => void;
  diffs: string[];
  setDiffs: (list: string[]) => void;
  status: StatusKey;
  setStatus: (s: StatusKey) => void;
  resetFilters: () => void;
  activeCount: number;
  catCounts: Record<string, number>;
  diffCounts: Record<string, number>;
  shown: number;
  total: number;
}) {
  return (
    <div className="relative glass-panel rounded-2xl border border-white/10 overflow-hidden">
      <i aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-violet to-secondary" />

      {/* Header */}
      <div className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 border border-white/10 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </span>
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-muted">Target</p>
            <p className="font-display font-bold text-sm text-white leading-none">Filter Panel</p>
          </div>
        </div>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold font-mono">
            {activeCount}
          </span>
        )}
      </div>

      <div className="relative p-5 space-y-6">
        {/* Search */}
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-muted mb-2">Search</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/60" />
            <SmoothInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search targets…"
              className="text-xs text-white placeholder:text-muted/40"
              wrapperClassName="bg-void-4/70 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 focus-within:border-secondary/50 focus-within:ring-1 focus-within:ring-secondary/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted/50 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-muted mb-2">Category</p>
          <div className="space-y-1">
            {Object.entries(catCounts).map(([cat, count]) => {
              const meta = catMeta[cat] ?? catMeta.misc;
              const active = cats.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCats(toggleIn(cats, cat))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-body font-semibold transition-all duration-200 ${
                    active
                      ? "border-white/15 bg-gradient-to-r from-primary/10 to-secondary/10 text-white"
                      : "border-white/[0.06] bg-white/[0.02] text-muted hover:border-white/15 hover:text-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${active ? "shadow-[0_0_6px_currentColor]" : "opacity-60"}`} />
                  <span className="flex-1 text-left capitalize">{meta.label}</span>
                  <span className={`font-mono text-[10px] tabular-nums ${active ? "text-white/80" : "text-muted/50"}`}>{count}</span>
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded-[4px] border transition-all duration-200 ${
                      active ? "bg-gradient-to-r from-primary to-secondary border-transparent text-white" : "border-white/15 text-transparent"
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-muted mb-2">Difficulty</p>
          <div className="space-y-1">
            {DIFFICULTIES.map((d) => {
              const diff = difficultyMeta[d] ?? difficultyMeta.easy;
              const active = diffs.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiffs(toggleIn(diffs, d))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-body font-semibold capitalize transition-all duration-200 ${
                    active
                      ? "border-white/15 bg-gradient-to-r from-primary/10 to-secondary/10 text-white"
                      : "border-white/[0.06] bg-white/[0.02] text-muted hover:border-white/15 hover:text-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${diff.dot} ${active ? "shadow-[0_0_6px_currentColor]" : "opacity-60"}`} />
                  <span className="flex-1 text-left">{d}</span>
                  <span className={`font-mono text-[10px] tabular-nums ${active ? "text-white/80" : "text-muted/50"}`}>{diffCounts[d] ?? 0}</span>
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded-[4px] border transition-all duration-200 ${
                      active ? "bg-gradient-to-r from-primary to-secondary border-transparent text-white" : "border-white/15 text-transparent"
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-muted mb-2">Status</p>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-white/[0.07] bg-void-4/50">
            {STATUSES.map((s) => {
              const active = status === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatus(s.key)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-body font-bold uppercase tracking-wider transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-white border border-primary/25 shadow-[0_0_14px_rgba(255,23,68,0.15)]"
                      : "text-muted hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/[0.07] space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted/60 text-center">
            <span className="text-white font-bold tabular-nums">{shown}</span> / {total} targets shown
          </p>
          <button
            type="button"
            onClick={resetFilters}
            disabled={activeCount === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-danger/30 bg-danger/[0.06] text-danger text-[11px] font-body font-semibold hover:bg-danger hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset filters
          </button>
        </div>
      </div>
    </div>
  );
}