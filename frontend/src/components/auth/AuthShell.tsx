"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Crosshair,
  Cpu,
  Globe,
  Lock,
  Radar,
  ShieldCheck,
  Target,
  Users,
  Zap,
  Fingerprint,
  Clock,
} from "lucide-react";
import { getPublicJson } from "@/lib/publicData";
import { AnimatedNumber, StatusBadge } from "@/components/ui/primitives";
import { deployContainer, deployItem } from "@/lib/motion";
import { MobileAuthStrip } from "./AuthPanels";
import ParticleField from "@/components/ui/ParticleField";
interface AuthShellProps {
  variant: "login" | "register";
  children: React.ReactNode;
  /** Vertical placement of the form column. Defaults to "center". */
  align?: "center" | "up";
  /** Showcase density. "minimal" drops the security chain, pro tip and operational footer. */
  showcase?: "full" | "minimal";
}

const TIPS = [
  "Never reuse passphrases across battlegrounds.",
  "Always enumerate before you exploit.",
  "Read the challenge source — flags hide in plain sight.",
  "Fastest correct flag wins the tie. Move with intent.",
  "Enable 2FA — your dossier is your identity.",
];

const FEATURES = [
  { icon: Globe, label: "Global Arena", desc: "Compete across 6 warfare domains", tone: "text-secondary" },
  { icon: Cpu, label: "Dynamic Scoring", desc: "Points decay as more operatives solve", tone: "text-primary" },
  { icon: Lock, label: "Zero Trust", desc: "SHA-256 verified flags, constant-time checked", tone: "text-secondary" },
  { icon: Activity, label: "Live Telemetry", desc: "Real-time scoreboard & first-blood alerts", tone: "text-primary" },
  { icon: Target, label: "Isolated Targets", desc: "Per-team sandboxes, zero cross-talk", tone: "text-secondary" },
  { icon: Crosshair, label: "Flag Integrity", desc: "Every submission hash-checked on arrival", tone: "text-primary" },
];

const SECURITY_CHAIN = [
  { icon: ShieldCheck, label: "JWT Encrypted" },
  { icon: Fingerprint, label: "SHA-256 Verified" },
  { icon: Lock, label: "Constant-Time" },
  { icon: Radar, label: "CSP / HSTS" },
  { icon: Zap, label: "Rate Limited" },
];

interface LiveStats {
  challenges: number;
  operatives: number;
}

const FALLBACK_STATS: LiveStats = {
  challenges: 42,
  operatives: 1024,
};

function useLiveStats() {
  const [stats, setStats] = useState<LiveStats>(FALLBACK_STATS);

  const load = useCallback(async () => {
    try {
      const statsData = await getPublicJson<{ challenges?: number; operatives?: number }>(
        "/public/stats"
      );
      if (!statsData) return;
      setStats({
        challenges: statsData.challenges ?? FALLBACK_STATS.challenges,
        operatives: statsData.operatives ?? FALLBACK_STATS.operatives,
      });
    } catch {
      /* keep current values */
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  return stats;
}

/* ───────────────────── Holographic Shield Badge ───────────────────── */

function HolographicShield({
  variant,
  minimal = false,
}: {
  variant: "login" | "register";
  /** "minimal" drops the hexagon + shield hologram (and its orbs/particles). */
  minimal?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center gap-6">
      {!minimal && (
        <>
          {/* Animated atmospheric orbs behind the hologram */}
          <div className="relative w-52 h-52 flex items-center justify-center">
        <div
          aria-hidden
          className="orb-red absolute -top-14 -left-8 opacity-25"
          style={{ animationDelay: "0s" }}
        />
        <div
          aria-hidden
          className="orb-blue absolute -bottom-12 -right-10 opacity-25"
          style={{ animationDelay: "1s" }}
        />
        <div
          aria-hidden
          className="orb-red absolute top-4 right-2 opacity-15"
          style={{ width: "180px", height: "180px", animationDelay: "2s" }}
        />

        {/* Logo tile with holographic glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div
              className={`relative w-40 h-40 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm flex items-center justify-center overflow-hidden ${
                variant === "login" ? "shadow-glow-red" : "shadow-glow-blue"
              }`}
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-secondary/[0.06]"
              />
              <motion.img
                src="/cgs-logo.png"
                alt="Cyber Guardian Society"
                draggable={false}
                className="relative w-32 h-32 object-contain drop-shadow-[0_0_24px_rgba(0,180,255,0.35)]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Radiating particle dots */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const r = 76;
              const x = 88 + r * Math.cos(rad);
              const y = 88 + r * Math.sin(rad);
              const isBlue = deg % 90 === 0 || deg % 90 === 45;
              return (
                <motion.div
                  key={deg}
                  className={`absolute w-1.5 h-1.5 rounded-full ${
                    isBlue ? "bg-secondary" : "bg-primary"
                  } shadow-glow-red`}
                  style={{ left: x - 3, top: y - 3 }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: deg / 60,
                    ease: "easeInOut",
                  }}
                />
              );
            })}
          </div>
        </motion.div>
      </div>
        </>
      )}

      {/* Brand header */}
      <div className="text-center space-y-2">
        <h2 className="font-display font-black text-3xl xl:text-4xl text-white tracking-tight leading-[1.04]">
          CYBER GUARDIAN
          <br />
          <span className="text-gradient-cgs">SOCIETY</span> CTF
        </h2>
        <p className="font-body text-sm text-ink-2 max-w-md mx-auto leading-relaxed">
          A production-grade capture-the-flag arena for elite operatives across
          web, pwn, crypto, forensics, reversing and OSINT battlegrounds.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────── Live Ops Dashboard ───────────────────── */

function ArenaShowcase({
  variant,
  showcase,
}: {
  variant: "login" | "register";
  /** "full" shows every panel; "minimal" drops the security chain, pro tip and operational footer. */
  showcase?: "full" | "minimal";
}) {
  const stats = useLiveStats();
  const [tipIdx, setTipIdx] = useState(0);
  const [featIdx, setFeatIdx] = useState(0);

  useEffect(() => {
    const f = setInterval(() => setFeatIdx((i) => (i + 1) % FEATURES.length), 6500);
    if (showcase === "minimal") return () => clearInterval(f);
    const t = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 5500);
    return () => {
      clearInterval(t);
      clearInterval(f);
    };
  }, [showcase]);

  return (
    <div
      className={`hidden lg:flex flex-col justify-center ${
        showcase === "minimal" ? "gap-6" : "gap-10"
      } lg:pr-12 xl:pr-16`}
    >
      {/* 1. Holographic Shield + Brand */}
      <HolographicShield variant={variant} minimal={showcase === "minimal"} />

      {/* 2. Live Operational Stats */}
      <motion.div
        variants={deployContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4"
      >
        <motion.div variants={deployItem}>
          <div className="cgs-card px-4 py-3.5 flex items-center gap-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-transparent border border-primary/20 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-body text-[9px] text-muted-2 uppercase tracking-wider">
                Challenges Live
              </p>
              <p className="font-display font-black text-2xl text-white">
                <AnimatedNumber value={stats.challenges} />
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div variants={deployItem}>
          <div className="cgs-card px-4 py-3.5 flex items-center gap-3 rounded-2xl border border-white/10 hover:border-secondary/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/15 to-transparent border border-secondary/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="font-body text-[9px] text-muted-2 uppercase tracking-wider">
                Operatives Enlisted
              </p>
              <p className="font-display font-black text-2xl text-white">
                <AnimatedNumber value={stats.operatives} />
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Feature Carousel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={`relative rounded-2xl border border-white/10 bg-white/[0.02] ${
          showcase === "minimal" ? "p-4" : "p-5 sm:p-6"
        } overflow-hidden`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={featIdx}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-start gap-4"
          >
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${
                FEATURES[featIdx].tone === "text-primary"
                  ? "from-primary/15 to-primary/5 border border-primary/20"
                  : "from-secondary/15 to-secondary/5 border border-secondary/20"
              } shrink-0`}
            >
              {React.createElement(FEATURES[featIdx].icon, {
                className: `w-5 h-5 ${FEATURES[featIdx].tone}`,
              })}
            </div>
            <div className="space-y-1.5">
              <p
                className={`font-display font-bold text-sm ${
                  FEATURES[featIdx].tone === "text-primary" ? "text-primary" : "text-secondary"
                }`}
              >
                {FEATURES[featIdx].label}
              </p>
              <p className="font-body text-xs text-muted leading-relaxed max-w-xs">
                {FEATURES[featIdx].desc}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute -bottom-1 -left-1 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </motion.div>

      {showcase !== "minimal" && (
        <>
          {/* 4. Security Chain */}
          <div className="flex flex-wrap gap-2">
            {SECURITY_CHAIN.map((s) => (
              <StatusBadge key={s.label} tone="success" dot={false}>
                <span className="flex items-center gap-1">
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </span>
              </StatusBadge>
            ))}
          </div>

          {/* 5. Pro Tip Carousel */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 font-mono text-[9px] text-muted-2 uppercase tracking-widest">
              <Clock className="w-3 h-3 text-primary" />
              <span>Pro Tip</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="font-body text-[11px] text-muted leading-relaxed"
              >
                <span className="text-primary font-semibold mr-1.5">›</span>
                {TIPS[tipIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* 6. Operational Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex items-center justify-between pt-4"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
              </span>
              <span className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.25em]">
                v1.4.0-PROD • OPERATIONAL
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted-2">
              est. 2026 • Cyber Guardians United
            </p>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default function AuthShell({
  variant,
  children,
  align = "center",
  showcase = "full",
}: AuthShellProps) {
  return (
    <div
      className={`min-h-screen relative ${
        align === "up" ? "pt-16 pb-6" : "pt-28 pb-16"
      } px-4 sm:px-6`}
    >
      {/* Ambient background orbs + mouse-interactive particles */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
        <ParticleField opacity={0.6} density={16000} />
        <div className="orb-red -top-20 -left-20 opacity-15" />
        <div className="orb-blue -bottom-24 right-10 opacity-15" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <MobileAuthStrip variant={variant} />

        <div
          className={`grid grid-cols-1 lg:grid-cols-2 items-stretch ${
            align === "up" ? "gap-8 lg:gap-10" : "gap-10 lg:gap-14"
          }`}
        >
          {/* Left column — beautiful showcase */}
          <ArenaShowcase variant={variant} showcase={showcase} />

          {/* Right column — form */}
          <div className={`flex items-center justify-center ${align === "up" ? "-translate-y-6" : ""}`}>
            <div className="w-full max-w-lg">
              {/* Outer box — page-level padding + background treatment */}
              <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.015] p-4 sm:p-7 overflow-hidden">
                <div
                  aria-hidden
                  className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-60"
                  style={{
                    background:
                      variant === "login"
                        ? "radial-gradient(circle, rgba(255,23,68,0.14) 0%, transparent 65%)"
                        : "radial-gradient(circle, rgba(0,180,255,0.14) 0%, transparent 65%)",
                    filter: "blur(40px)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-40"
                  style={{
                    background:
                      variant === "login"
                        ? "radial-gradient(circle, rgba(0,180,255,0.12) 0%, transparent 65%)"
                        : "radial-gradient(circle, rgba(255,23,68,0.10) 0%, transparent 65%)",
                    filter: "blur(40px)",
                  }}
                />
                <div aria-hidden className="cgs-hairline mb-6" />

                {/* Inner box — the form card */}
                <div
                  className={`glass-panel rounded-3xl ${
                    align === "up" ? "p-5 sm:p-6" : "p-7 sm:p-9"
                  } border border-white/10 shadow-2xl relative space-y-6`}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
