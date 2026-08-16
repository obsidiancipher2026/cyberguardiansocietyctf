"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Fingerprint,
  Flag,
  Lock,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { getPublicJson } from "@/lib/publicData";
import { AnimatedNumber } from "@/components/ui/primitives";
import type { AuthAccent } from "./AuthField";

/* ───────────────────────────── Shared shell ───────────────────────────── */

function PanelShell({
  accent,
  children,
}: {
  accent: AuthAccent;
  children: React.ReactNode;
}) {
  const isLogin = accent === "primary";
  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-white/10 p-8 xl:p-10 flex flex-col justify-center gap-8 min-h-[600px]"
      style={{
        background:
          "linear-gradient(160deg, rgba(13,15,22,0.6) 0%, rgba(18,21,31,0.35) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div aria-hidden className={isLogin ? "orb-red -top-24 -left-24" : "orb-blue -top-24 -right-24"} />
      <div aria-hidden className={isLogin ? "orb-blue -bottom-24 -right-24 opacity-70" : "orb-red -bottom-24 -left-24 opacity-70"} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div
        aria-hidden
        className="absolute left-0 top-10 bottom-10 w-[3px] rounded-full bg-gradient-to-b from-primary to-secondary opacity-60"
      />
      <div className="relative z-10 space-y-8">{children}</div>
    </div>
  );
}

function ShieldTile({ accent }: { accent: AuthAccent }) {
  const isLogin = accent === "primary";
  return (
    <div className="inline-flex p-3.5 rounded-2xl border border-white/10 bg-white/[0.03]">
      <div
        className={`inline-flex p-2.5 rounded-xl ${
          isLogin ? "bg-primary/10 border border-primary/20" : "bg-secondary/10 border border-secondary/20"
        }`}
      >
        <img
          src="/cgs-logo.png"
          alt="Cyber Guardian Society"
          draggable={false}
          className="w-5 h-5 object-contain"
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.22em] flex items-center gap-2">
      <span aria-hidden className="w-4 h-px bg-white/20" />
      {children}
    </p>
  );
}

/* ───────────────────────────── Shared live stats ───────────────────────────── */

interface LiveStats {
  challenges: number;
  operatives: number;
  topOperative: { name: string; points: number; solves: number } | null;
}

const FALLBACK_STATS: LiveStats = {
  challenges: 109,
  operatives: 2417,
  topOperative: null,
};

function useLiveStats() {
  const [stats, setStats] = useState<LiveStats>(FALLBACK_STATS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statsData = await getPublicJson<{
          challenges?: number;
          operatives?: number;
          topOperative?: { name: string; points: number; solves: number } | null;
        }>("/public/stats");
        if (cancelled) return;
        if (!statsData) return;
        const top = statsData.topOperative;
        setStats((s) => ({
          challenges: statsData.challenges ?? s.challenges,
          operatives: statsData.operatives ?? s.operatives,
          topOperative: top
            ? { name: top.name, points: top.points ?? 0, solves: top.solves ?? 0 }
            : s.topOperative,
        }));
      } catch {
        /* keep fallback stats */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}

/* ───────────────────────────── Arena intelligence panel ───────────────────────────── */

const UPLINK_STATUS = [
  { label: "Secure session", value: "encrypted" },
  { label: "Scoreboard feed", value: "live" },
  { label: "Challenge manifest", value: "decrypted" },
  { label: "Flag integrity check", value: "verified" },
  { label: "Identity handshake", value: "locked" },
];

const INTELLIGENCE_FEED = [
  {
    icon: Flag,
    tone: "text-secondary border-secondary/30 bg-secondary/10",
    text: "New challenge wave deployed across Web, Pwn & Crypto domains.",
  },
  {
    icon: Trophy,
    tone: "text-warning border-warning/30 bg-warning/10",
    text: "First blood claimed — the scoreboard is heating up.",
  },
  {
    icon: Activity,
    tone: "text-secondary border-secondary/30 bg-secondary/10",
    text: "Dynamic point decay active — solve fast to score full value.",
  },
  {
    icon: Lock,
    tone: "text-primary border-primary/30 bg-primary/10",
    text: "All flags verified via constant-time comparison.",
  },
];

const TIPS = [
  "Never reuse passphrases across battlegrounds.",
  "Always enumerate before you exploit.",
  "Read the challenge source — flags hide in plain sight.",
  "Fastest correct flag wins the tie. Move with intent.",
];

function ArenaIntelligencePanel({ accent }: { accent: AuthAccent }) {
  const isLogin = accent === "primary";
  const stats = useLiveStats();
  const [feedIdx, setFeedIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const feedT = setInterval(() => setFeedIdx((i) => (i + 1) % INTELLIGENCE_FEED.length), 5000);
    const tipT = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 6000);
    return () => {
      clearInterval(feedT);
      clearInterval(tipT);
    };
  }, []);

  const feed = INTELLIGENCE_FEED[feedIdx];
  const FeedIcon = feed.icon;

  return (
    <PanelShell accent={accent}>
      {/* Brand block */}
      <div className="flex items-center gap-4">
        <ShieldTile accent={accent} />
        <div className="leading-tight">
          <p className="font-display font-black text-xl text-white tracking-tight">
            CGS<span className="text-gradient-cgs">.CTF</span> ARENA
          </p>
          <p className="font-mono text-[9px] text-muted-2 uppercase tracking-[0.25em]">
            Cyber Guardian Society
          </p>
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="font-display font-black text-2xl xl:text-3xl text-white tracking-tight">
          {isLogin ? (
            <>WELCOME BACK, <span className="text-gradient-cgs">OPERATOR</span></>
          ) : (
            <>FREE. SOLO. <span className="text-gradient-cgs">NO TEAMS REQUIRED.</span></>
          )}
        </h2>
        <p className="font-body text-xs text-muted leading-relaxed max-w-sm">
          {isLogin
            ? "Re-establish your encrypted session and resume operations on the battleground."
            : "Enlist today — every flag is yours alone, your rank is your own work."}
        </p>
      </div>

      {/* Uplink status console */}
      <div className="rounded-2xl border border-white/10 bg-void-2/70 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <span className="font-mono text-[10px] text-muted-2 uppercase tracking-widest">
            Uplink Status
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-secondary uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary radar-pulse" />
            live
          </span>
        </div>
        <div className="px-4 py-3.5 grid grid-cols-2 gap-x-5 gap-y-2.5">
          {UPLINK_STATUS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <span className="font-body text-[10px] text-muted truncate">{row.label}</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white shrink-0">
                <span className="w-1 h-1 rounded-full bg-secondary radar-pulse" />
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Arena stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-2 uppercase tracking-widest">
            <Flag className="w-3 h-3 text-primary" /> Challenges Live
          </span>
          <p className="font-display font-black text-2xl text-white">
            <AnimatedNumber value={stats.challenges} />
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-2 uppercase tracking-widest">
            <Users className="w-3 h-3 text-secondary" /> Operatives Enlisted
          </span>
          <p className="font-display font-black text-2xl text-white">
            <AnimatedNumber value={stats.operatives} format={(n) => n.toLocaleString()} />
          </p>
        </div>
      </div>

      {/* Intelligence feed */}
      <div className="space-y-3">
        <SectionLabel>Intelligence Feed</SectionLabel>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 min-h-[76px] flex items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={feedIdx}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              <span className={`inline-flex p-2 rounded-xl border shrink-0 ${feed.tone}`}>
                <FeedIcon className="w-3.5 h-3.5" />
              </span>
              <p className="font-body text-[11px] text-muted leading-relaxed">{feed.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Security chain chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/20 bg-success/[0.06] font-mono text-[9px] uppercase tracking-widest text-success/90">
          <ShieldCheck className="w-3 h-3" /> SHA-256 Verified
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/20 bg-success/[0.06] font-mono text-[9px] uppercase tracking-widest text-success/90">
          <Fingerprint className="w-3 h-3" /> Hash Verified
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/20 bg-success/[0.06] font-mono text-[9px] uppercase tracking-widest text-success/90">
          <Lock className="w-3 h-3" /> Constant-Time
        </span>
      </div>

      {/* Rotating transmission tip */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
        <span className="w-1.5 h-1.5 rounded-full bg-primary radar-pulse shrink-0 mt-1.5" />
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-body text-[11px] text-muted leading-relaxed"
          >
            <span className="text-primary font-semibold mr-1.5">TIP //</span>
            {TIPS[tipIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </PanelShell>
  );
}

export function LoginPanel() {
  return <ArenaIntelligencePanel accent="primary" />;
}

export function RegisterPanel() {
  return <ArenaIntelligencePanel accent="secondary" />;
}

/* ───────────────────────────── Mobile compact strip ───────────────────────────── */

export function MobileAuthStrip({ variant }: { variant: "login" | "register" }) {
  const isLogin = variant === "login";
  return (
    <div className="lg:hidden mb-8 flex items-center justify-center">
      <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel border border-white/10">
        <div
          className={`inline-flex p-2 rounded-xl border ${
            isLogin
              ? "bg-primary/10 border-primary/20"
              : "bg-secondary/10 border-secondary/20"
          }`}
        >
          <img
          src="/cgs-logo.png"
          alt="Cyber Guardian Society"
          draggable={false}
          className="w-4 h-4 object-contain"
        />
        </div>
        <div className="leading-tight">
          <p className="font-display font-black text-xs text-white tracking-wide">
            {isLogin ? "WELCOME BACK, OPERATOR" : "FREE. SOLO. NO TEAMS REQUIRED."}
          </p>
          <p className="font-body text-[10px] text-muted">
            {isLogin ? "Resume your operations." : "Every flag is yours alone."}
          </p>
        </div>
      </div>
    </div>
  );
}
