"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Server,
  Radio,
  Flame,
  Scale,
  Ban,
  KeyRound,
  UserCheck,
  AlertTriangle,
  Terminal,
  Crosshair,
  Zap,
  Gavel,
  Shield,
  Users,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/primitives";
import { deployContainer, deployItem } from "@/lib/motion";
import ParticleField from "@/components/ui/ParticleField";

const rules = [
  {
    icon: Ban,
    title: "No Denial-of-Service",
    desc: "Attacking platform infrastructure, challenge servers, or attempting to degrade availability for other operatives is strictly forbidden.",
    tone: "red",
    badge: "text-primary border-primary/30 bg-primary/10",
  },
  {
    icon: Scale,
    title: "Dynamic Scoring Active",
    desc: "Challenge values decay as more operatives solve them. Early solvers earn premium points — pace yourself and prioritize targets.",
    tone: "blue",
    badge: "text-secondary border-secondary/30 bg-secondary/10",
  },
  {
    icon: KeyRound,
    title: "Flag Format Compliance",
    desc: "All flags must be submitted in the CGS{...} format. Improperly formatted or truncated payloads will be rejected by the verifier.",
    tone: "blue",
    badge: "text-secondary border-secondary/30 bg-secondary/10",
  },
  {
    icon: UserCheck,
    title: "One Operative Per Account",
    desc: "Sharing accounts, using multiple identities, or operating proxy accounts for any team is a direct violation of competition integrity.",
    tone: "blue",
    badge: "text-secondary border-secondary/30 bg-secondary/10",
  },
  {
    icon: Users,
    title: "Zero Collusion",
    desc: "Flag sharing between teams, solution leaking, and cross-team coordination during live events results in immediate disqualification.",
    tone: "red",
    badge: "text-primary border-primary/30 bg-primary/10",
  },
  {
    icon: AlertTriangle,
    title: "Respect The Arena",
    desc: "Penetration testing is permitted only on designated challenge targets. Any attack on external hosts, users, or third-party services is banned.",
    tone: "red",
    badge: "text-primary border-primary/30 bg-primary/10",
  },
];

const pillars = [
  {
    icon: Server,
    title: "Containerized Isolation",
    desc: "Dedicated per-team Docker instances with network firewalls enforcing zero cross-talk between competitors.",
    color: "text-secondary",
    glow: "hover:border-secondary/40 hover:shadow-glow-blue",
  },
  {
    icon: Radio,
    title: "Real-Time Telemetry",
    desc: "Server-Sent Events broadcasting live scoreboard updates, first-blood alerts, and announcements.",
    color: "text-secondary",
    glow: "hover:border-secondary/40 hover:shadow-glow-blue",
  },
  {
    icon: Flame,
    title: "Dynamic Point Decay",
    desc: "Values decay per solve to reward early exploitation and keep the battleground fiercely competitive.",
    color: "text-primary",
    glow: "hover:border-primary/40 hover:shadow-glow-red",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-28 pb-20 space-y-24 relative overflow-hidden">
      {/* Mouse-interactive particles across the whole page */}
      <ParticleField opacity={0.45} density={16000} maxParticles={50} />
      {/* Ambient Background Radial Glows */}
      <div className="orb-red top-32 left-10 pointer-events-none" />
      <div className="orb-blue top-[50rem] right-10 pointer-events-none" />

      {/* 1. HERO HEADER */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-body font-semibold text-primary">
          <Terminal className="w-3.5 h-3.5" />
          <span>CYBER GUARDIAN SOCIETY — UNIT DOSSIER</span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.05]">
          ABOUT THE <br />
          <span className="text-gradient-cgs">BATTLEGROUND</span>
        </h1>

        <p className="font-body text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          CGS CTF is a production-grade, zero-trust competition platform engineered for security researchers,
          ethical hackers, and cyber defense operatives. Every component — from flag verification to score
          telemetry — is hardened, audited, and built for war.
        </p>

        {/* Stat Strip with Animated Count-Ups and Alternating Red/Blue Accents */}
        <motion.div
          variants={deployContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 max-w-3xl mx-auto"
        >
          <motion.div variants={deployItem} className="cgs-card p-5 rounded-2xl border border-white/10 text-center relative overflow-hidden">
            <span className="font-display font-black text-3xl text-secondary block">
              <AnimatedNumber value={6} />
            </span>
            <span className="font-body text-[10px] text-muted uppercase tracking-wider">Warfare Domains</span>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary" />
          </motion.div>

          <motion.div variants={deployItem} className="cgs-card p-5 rounded-2xl border border-white/10 text-center relative overflow-hidden">
            <span className="font-display font-black text-2xl text-primary block mt-1">12</span>
            <span className="font-body text-[10px] text-muted uppercase tracking-wider">Bcrypt Rounds</span>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
          </motion.div>

          <motion.div variants={deployItem} className="cgs-card p-5 rounded-2xl border border-white/10 text-center relative overflow-hidden">
            <span className="font-display font-black text-3xl text-secondary block">
              <AnimatedNumber value={100} format={(n) => `${n}%`} />
            </span>
            <span className="font-body text-[10px] text-muted uppercase tracking-wider">Docker Isolation</span>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary" />
          </motion.div>

          <motion.div variants={deployItem} className="cgs-card p-5 rounded-2xl border border-white/10 text-center relative overflow-hidden">
            <span className="font-display font-black text-2xl text-primary block mt-1">SSE</span>
            <span className="font-body text-[10px] text-muted uppercase tracking-wider">Live Telemetry</span>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
          </motion.div>
        </motion.div>
      </section>

      {/* 2. PLATFORM RULES PANEL */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="cgs-card rounded-3xl border border-white/10 overflow-hidden relative shadow-glass-lg">
          {/* Animated Gradient Hairline Top Border */}
          <div className="cgs-hairline" />

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Rules Intro Panel */}
            <div className="lg:col-span-4 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-white/10 space-y-6 bg-void-2/60">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-body font-semibold text-primary">
                <Gavel className="w-3.5 h-3.5" />
                <span>OFFICIAL REGULATIONS</span>
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                PLATFORM <span className="text-gradient-cgs">RULES</span>
              </h2>
              <p className="font-body text-xs text-muted leading-relaxed">
                Every operative entering the arena is bound by these standing orders. Violations are logged,
                reviewed, and adjudicated by the operations team.
              </p>

              {/* ZERO TOLERANCE Callout with Persistent Low-Amplitude Red Pulse */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/30 shadow-glow-red relative overflow-hidden">
                <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="font-body text-xs text-primary font-semibold leading-relaxed">
                  ZERO TOLERANCE: Any violation results in immediate disqualification without appeal.
                </p>
              </div>
            </div>

            {/* Right: 6 Rules Grid */}
            <div className="lg:col-span-8 p-8 sm:p-10">
              <motion.div
                variants={deployContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {rules.map((rule, idx) => {
                  const Icon = rule.icon;
                  return (
                    <motion.div
                      key={rule.title}
                      variants={deployItem}
                      className="group p-5 rounded-2xl bg-void-3/70 border border-white/10 hover:border-white/25 transition-all duration-300 space-y-3 relative overflow-hidden charge-hover"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${rule.badge}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        {/* Background Ghost Number (01–06) */}
                        <span className="font-display font-black text-3xl text-white/5 group-hover:text-white/10 transition-colors pointer-events-none">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-white">{rule.title}</h4>
                      <p className="font-body text-xs text-muted leading-relaxed">{rule.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM ARCHITECTURE CORE (4 Pillars) */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 z-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-xs font-body font-semibold text-secondary">
            <Crosshair className="w-3.5 h-3.5" />
            <span>ZERO-TRUST ENGINEERING</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            ARCHITECTURE <span className="text-gradient-cgs">CORE</span>
          </h2>
          <p className="font-body text-sm text-muted">
            The four engineering pillars that make the arena tamper-proof, isolated, and relentlessly real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={`cgs-card p-6 rounded-2xl border border-white/10 space-y-4 group transition-all duration-300 charge-hover ${p.glow}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-7 h-7 ${p.color} group-hover:scale-110 transition-transform`} />
                  <span className={`w-2 h-2 rounded-full ${p.color.includes("primary") ? "bg-primary" : "bg-secondary"} radar-pulse`} />
                </div>
                <h4 className="font-display font-bold text-base text-white">{p.title}</h4>
                <p className="font-body text-xs text-muted leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. FINAL CTA BAND */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="cgs-card rounded-3xl p-8 sm:p-14 border border-primary/30 shadow-glow-red relative overflow-hidden text-center space-y-6">
          <div className="cgs-scanline opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-transparent pointer-events-none" />

          <Zap className="w-8 h-8 text-primary mx-auto" />
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
            READY TO JOIN <span className="text-gradient-cgs">THE RANKS?</span>
          </h2>
          <p className="font-body text-sm text-muted max-w-xl mx-auto leading-relaxed">
            Every guardian started as an operative. Register, infiltrate your first target, and climb the global scoreboard.
          </p>
          <Link
            href="/auth/register"
            className="relative overflow-hidden inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary via-primary-glow to-violet text-white font-body text-sm font-bold shadow-glow-red hover:scale-105 transition-all charge-hover"
          >
            <span aria-hidden className="cgs-sweep" />
            <Zap className="w-4 h-4 fill-current relative z-10" />
            <span className="relative z-10">REGISTER AS OPERATIVE</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
