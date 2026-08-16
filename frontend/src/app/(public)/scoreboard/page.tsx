"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Trophy,
  Radio,
  Clock,
  Shield,
  Medal,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ScoreboardEntry } from "@cgs-ctf/shared";
import {
  PageContainer,
  PageHeader,
  StatusBadge,
  AnimatedNumber,
  EmptyState,
} from "@/components/ui/primitives";
import { deployContainer, deployItem } from "@/lib/motion";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const fallbackStandings: ScoreboardEntry[] = [];

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ScoreboardPage() {
  const [entries, setEntries] = useState<ScoreboardEntry[]>(fallbackStandings);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const [progress, setProgress] = useState(0);
  const fetchToken = useRef(0);
  const startRef = useRef(Date.now());
  const REFRESH_MS = 15000;

  const load = useCallback(async () => {
    const token = ++fetchToken.current;
    try {
      const res = await api.get("/scoreboard?mode=individual");
      if (token !== fetchToken.current) return;
      const data = res.data;
      if (Array.isArray(data.entries) && data.entries.length > 0) {
        setEntries(data.entries);
        setLive(true);
      } else {
        setEntries([]);
        setLive(false);
      }
    } catch {
      if (token !== fetchToken.current) return;
      setEntries([]);
      setLive(false);
    } finally {
      if (token === fetchToken.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const elapsedMs = Date.now() - startRef.current;
      const frac = Math.min(1, elapsedMs / REFRESH_MS);
      setProgress(frac);
      if (elapsedMs >= REFRESH_MS) {
        startRef.current = Date.now();
        setProgress(0);
        load();
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [load]);

  const ringCircumference = 2 * Math.PI * 15;
  const secondsLeft = Math.ceil((1 - progress) * (REFRESH_MS / 1000));

  return (
    <ProtectedRoute>
    <PageContainer className="pt-28 pb-16 space-y-8">
      {/* HERO HEADER */}
      <motion.div
        variants={deployContainer}
        initial="hidden"
        animate="show"
        className="text-center space-y-4"
      >
        <motion.div variants={deployItem}>
          <PageHeader
            eyebrow="Real-Time Standings"
            eyebrowIcon={Radio}
            title="LIVE"
            gradientWord="SCOREBOARD"
            description="Dynamic competition standings reflecting live flag captures, First Blood bonuses, and score decay."
            compact
          />
        </motion.div>
      </motion.div>

      {/* LEADERBOARD TABLE */}
      <motion.div
        variants={deployItem}
        initial="hidden"
        animate="show"
        className="mt-6"
      >
        <div className="cgs-card overflow-hidden shadow-glass-lg">
          {/* Animated Hairline Top Border */}
          <div className="cgs-hairline" />

          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-6 py-4 border-b border-white/10 bg-void-2/80">
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <h2 className="font-display font-bold text-base text-white whitespace-nowrap">Ranked Standings</h2>
            </div>

            {/* LIVE Badge (Signal Red Radar Pulse) */}
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative w-8 h-8">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                      <defs>
                        <linearGradient id="refreshRing" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#FF1744" />
                          <stop offset="100%" stopColor="#00B4FF" />
                        </linearGradient>
                      </defs>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="url(#refreshRing)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringCircumference * (1 - progress)}
                        style={{ transition: "stroke-dashoffset 0.1s linear" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-white tabular-nums">
                      {secondsLeft}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Auto-refreshes every 15 seconds</TooltipContent>
              </Tooltip>
              <StatusBadge tone={live ? "danger" : "muted"} pulse={live} className="max-[430px]:hidden">
                {live ? "LIVE TELEMETRY" : "OFFLINE / DEMO"}
              </StatusBadge>
            </div>
          </div>

          {!loaded ? (
            <div className="p-8">
              <EmptyState
                icon={Shield}
                title="Contacting scoreboard"
                description="Fetching live standings — this takes a moment."
              />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Shield}
                title="No Rankings Yet"
                description="Competition standings appear here as soon as operatives begin capturing flags."
              />
            </div>
          ) : (
            <>
              {/* Table Column Headers */}
              <div className="hidden sm:grid grid-cols-[80px_1fr_100px_160px_120px] gap-4 px-6 py-3 border-b border-white/10 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                <span>Rank</span>
                <span>Operative</span>
                <span className="text-center">Solves</span>
                <span>Last Activity</span>
                <span className="text-right">Score</span>
              </div>

              {/* Rows with Smooth FLIP Vertical Reordering & Score Roll */}
              <div className="divide-y divide-white/[0.05]">
                <AnimatePresence initial={false}>
                  {entries.map((row, idx) => {
                    const isTop1 = row.rank === 1;
                    const isTop2 = row.rank === 2;
                    const isTop3 = row.rank === 3;
                    const isRecent = row.lastSolveAt && (Date.now() - new Date(row.lastSolveAt).getTime()) < 600000;

                    return (
                      <motion.div
                        key={`${row.rank}-${row.name}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className={`group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[80px_1fr_100px_160px_120px] gap-3 sm:gap-4 items-center px-4 sm:px-6 py-3 sm:py-3.5 transition-colors ${
                          isTop1
                            ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-l-4 border-l-primary"
                            : isTop2
                            ? "bg-gradient-to-r from-secondary/10 via-secondary/5 to-transparent border-l-4 border-l-secondary"
                            : isTop3
                            ? "bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-l-4 border-l-warning"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* Rank Badge */}
                        <span className="flex items-center gap-3">
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm border shadow-sm ${
                              isTop1
                                ? "bg-primary/20 border-primary/50 text-primary shadow-glow-red"
                                : isTop2
                                ? "bg-secondary/20 border-secondary/50 text-secondary shadow-glow-blue"
                                : isTop3
                                ? "bg-warning/20 border-warning/50 text-warning shadow-glow-amber"
                                : "bg-white/[0.04] border-white/10 text-muted"
                            }`}
                          >
                            {isTop1 ? <Medal className="w-4 h-4 text-primary" /> : row.rank}
                          </span>
                          <span className="hidden sm:inline font-mono text-xs text-muted">#{row.rank}</span>
                        </span>

                        {/* Operative Name */}
                        <span className="min-w-0">
                          <span className={`block font-display font-bold text-sm sm:text-base truncate ${isTop1 ? "text-primary font-black" : isTop2 ? "text-secondary font-black" : "text-white"}`}>
                            {row.name}
                          </span>
                          <span className="sm:hidden font-body text-[10px] text-muted">
                            {row.solves} solves · {timeAgo(row.lastSolveAt)}
                          </span>
                        </span>

                        {/* Solves Count */}
                        <span className="hidden sm:block text-center font-mono text-xs font-semibold text-muted">
                          {row.solves}
                        </span>

                        {/* Last Activity */}
                        <span className="hidden sm:flex items-center gap-2 font-mono text-xs text-muted">
                          <Clock className="w-3.5 h-3.5 text-muted" />
                          <span>{timeAgo(row.lastSolveAt)}</span>
                          {isRecent && (
                            <span className="w-2 h-2 rounded-full bg-secondary radar-pulse" />
                          )}
                        </span>

                        {/* Score (Flux Digit Roll) */}
                        <span className="text-right font-display font-black text-lg sm:text-xl text-white tabular-nums">
                          <AnimatedNumber value={row.points} />
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Footer Guarantee */}
      <p className="flex items-center justify-center gap-2 font-body text-xs text-muted uppercase tracking-[0.2em] pt-2">
        <Shield className="w-4 h-4 text-secondary radar-pulse" />
        <span>Standings verified against the tamper-evident score chain</span>
      </p>
    </PageContainer>
    </ProtectedRoute>
  );
}
