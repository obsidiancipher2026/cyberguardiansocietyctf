"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  Globe,
  Cpu,
  Lock,
  Code,
  Search,
  Key,
  Flame,
  Layers,
  Radio,
  Server,
  Crosshair,
} from "lucide-react";
import HeroPanel from "@/components/HeroPanel";
import { deployContainer, deployItem } from "@/lib/motion";

/* Typewriter code component for domain cards */
function TypewriterCode({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayed(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [text]);

  return <code>{displayed}<span className="animate-pulse">_</span></code>;
}

export default function HomePage() {
  const domains = [
    {
      id: "web",
      name: "Web Exploitation",
      icon: Globe,
      color: "from-secondary/20 to-secondary/5 text-secondary border-secondary/30",
      accent: "text-secondary",
      bgGlow: "group-hover:shadow-glow-blue",
      description: "Bypass WAFs, exploit SSRF, SQLi, XSS, OAuth misconfigurations, and deep JWT cryptographic bugs.",
      count: "12 Challenges",
      sample: "SELECT * FROM users WHERE token = 'CGS{sql_inj_master}';",
    },
    {
      id: "pwn",
      name: "Binary Pwn",
      icon: Cpu,
      color: "from-primary/20 to-primary/5 text-primary border-primary/30",
      accent: "text-primary",
      bgGlow: "group-hover:shadow-glow-red",
      description: "Craft ROP chains, bypass ASLR & Stack Canaries, heap spray, and exploit kernel-level buffer overflows.",
      count: "8 Challenges",
      sample: "payload = flat({0: b'A'*40, 1: p64(win_func)})",
    },
    {
      id: "crypto",
      name: "Cryptography",
      icon: Key,
      color: "from-violet/20 to-violet/5 text-violet border-violet/30",
      accent: "text-violet",
      bgGlow: "group-hover:shadow-glow-purple",
      description: "Break weak RSA primes, LLL lattice attacks, custom cipher feistel networks, and ECDSA nonce reuse.",
      count: "10 Challenges",
      sample: "m = pow(c, d, n)  # CGS{rsa_gcd_factorization_broken}",
    },
    {
      id: "forensics",
      name: "Digital Forensics",
      icon: Search,
      color: "from-secondary/20 to-secondary/5 text-secondary border-secondary/30",
      accent: "text-secondary",
      bgGlow: "group-hover:shadow-glow-blue",
      description: "Dissect PCAP network traffic streams, RAM Volatility memory dumps, and extract hidden steganography.",
      count: "7 Challenges",
      sample: "volatility -f memory.raw --profile=Win10x64 malfind",
    },
    {
      id: "reversing",
      name: "Reverse Engineering",
      icon: Code,
      color: "from-primary/20 to-primary/5 text-primary border-primary/30",
      accent: "text-primary",
      bgGlow: "group-hover:shadow-glow-red",
      description: "Decompile obfuscated binaries in Ghidra & IDA Pro, reverse custom VM bytecode algorithms.",
      count: "6 Challenges",
      sample: "xor byte ptr [rax + rcx], 0x7F",
    },
    {
      id: "osint",
      name: "OSINT & Intelligence",
      icon: Crosshair,
      color: "from-secondary/20 to-secondary/5 text-secondary border-secondary/30",
      accent: "text-secondary",
      bgGlow: "group-hover:shadow-glow-blue",
      description: "Geo-locate satellite images, uncover darknet metadata leaks, and trace cryptocurrency wallets.",
      count: "5 Challenges",
      sample: "exiftool target.jpg | grep 'GPS Latitude'",
    },
  ];

  return (
    <div className="space-y-0 relative">
      {/* 1. HERO SECTION — EXPLICITLY PRESERVED & UNTOUCHED */}
      <HeroPanel />

      {/* 2. HOW THE ARENA WORKS (Connected 4-Step Sequence) */}
      <section className="py-24 relative overflow-hidden bg-void-2 border-y border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
          {/* Section Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-body font-semibold text-primary">
              <Zap className="w-3.5 h-3.5" />
              <span>TACTICAL ENGAGEMENT WORKFLOW</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
              HOW THE ARENA <span className="text-gradient-cgs">WORKS</span>
            </h2>
            <p className="font-body text-sm text-muted">
              Four streamlined steps from operative deployment to battleground leaderboard dominance.
            </p>
          </div>

          {/* Connected 4-Step Cards Grid with Dashed Connector Line */}
          <div className="relative">
            {/* Horizontal Dashed Connector Line (Desktop) */}
            <div aria-hidden className="hidden lg:block absolute top-1/2 left-12 right-12 h-0.5 border-t-2 border-dashed border-white/10 -translate-y-6 pointer-events-none z-0">
              <span className="absolute top-1/2 left-0 w-3 h-3 rounded-full bg-primary -translate-y-1/2 radar-pulse" />
            </div>

            <motion.div
              variants={deployContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
            >
              {/* Step 1 */}
              <motion.div variants={deployItem} className="cgs-card p-6 rounded-2xl border border-white/10 charge-hover group">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                  <span className="font-display font-black text-3xl text-gradient-cgs">01</span>
                  <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                    AUTH MATRIX
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-2">INFILTRATION</h3>
                <p className="font-body text-xs text-muted leading-relaxed">
                  Authenticate your operative credentials, set up clearance verification, and form or join a squad.
                </p>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={deployItem} className="cgs-card p-6 rounded-2xl border border-white/10 charge-hover group">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                  <span className="font-display font-black text-3xl text-gradient-cgs">02</span>
                  <span className="px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/30 text-[10px] font-mono text-secondary font-bold uppercase tracking-wider">
                    TRIAGE
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-2">RECON & TRIAGE</h3>
                <p className="font-body text-xs text-muted leading-relaxed">
                  Scan active challenge vectors across 6 warfare domains. Review point values and difficulty tiers.
                </p>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={deployItem} className="cgs-card p-6 rounded-2xl border border-white/10 charge-hover group">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                  <span className="font-display font-black text-3xl text-gradient-cgs">03</span>
                  <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                    EXECUTION
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-2">EXPLOIT & CAPTURE</h3>
                <p className="font-body text-xs text-muted leading-relaxed">
                  Spin up isolated target Docker containers on demand and extract hidden cryptographic root flags.
                </p>
              </motion.div>

              {/* Step 4 */}
              <motion.div variants={deployItem} className="cgs-card p-6 rounded-2xl border border-white/10 charge-hover group">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                  <span className="font-display font-black text-3xl text-gradient-cgs">04</span>
                  <span className="px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/30 text-[10px] font-mono text-secondary font-bold uppercase tracking-wider">
                    DOMINANCE
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-2">CLAIM BLOOD & POINTS</h3>
                <p className="font-body text-xs text-muted leading-relaxed">
                  Submit SHA-256 verified flags to trigger real-time dynamic score updates and claim First Blood.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. CYBER WARFARE DOMAINS MATRIX */}
      <section className="py-24 relative overflow-hidden">
        <div className="orb-blue top-1/3 left-10 pointer-events-none" />
        <div className="orb-red bottom-10 right-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-14">
          {/* Section Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-xs font-body font-semibold text-secondary">
              <Layers className="w-3.5 h-3.5" />
              <span>MULTIDIMENSIONAL TARGET VECTORS</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
              CYBER WARFARE <span className="text-gradient-cgs">DOMAINS</span>
            </h2>
            <p className="font-body text-sm text-muted">
              Six specialized warfare vectors. Each domain deploys hardened targets engineered to forge elite operatives.
            </p>
          </div>

          {/* Domain Cards Bento Grid */}
          <motion.div
            variants={deployContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {domains.map((dom, idx) => {
              const Icon = dom.icon;
              const featured = idx === 0;
              return (
                <motion.div
                  key={dom.id}
                  variants={deployItem}
                  className={`cgs-card rounded-2xl border border-white/10 hover:border-white/25 transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden charge-hover ${
                    dom.bgGlow
                  } ${featured ? "lg:col-span-2 lg:row-span-1 p-8" : "p-6"}`}
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${dom.color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        <Icon className={`${featured ? "w-7 h-7" : "w-6 h-6"}`} />
                      </div>
                      <span className={`font-mono text-xs font-semibold px-3 py-1 rounded-full border ${dom.color}`}>
                        {dom.count}
                      </span>
                    </div>

                    <h3 className={`font-display font-bold ${featured ? "text-2xl" : "text-xl"} text-white group-hover:text-white transition-colors`}>
                      {dom.name}
                    </h3>
                    <p className={`font-body text-xs text-muted leading-relaxed ${featured ? "max-w-lg" : ""}`}>
                      {dom.description}
                    </p>
                  </div>

                  {/* Terminal Code Strip with Typewriter Animation */}
                  <div className={`pt-3 border-t border-white/10 font-mono flex items-center gap-2 ${featured ? "text-xs" : "text-[11px]"} text-muted-2 truncate relative z-10`}>
                    <span className={`${dom.accent} font-bold flex-shrink-0`}>$</span>
                    <TypewriterCode text={dom.sample} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 4. PLATFORM ARCHITECTURE CORE (Engineered for Maximum Fidelity) */}
      <section className="py-20 bg-void-2 border-y border-hairline relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-xs font-body font-semibold text-secondary">
              <Shield className="w-3.5 h-3.5" />
              <span>ZERO-TRUST ARCHITECTURE</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              ENGINEERED FOR <span className="text-gradient-cgs">MAXIMUM FIDELITY</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="cgs-card p-6 rounded-2xl border border-white/10 space-y-3 group hover:border-primary/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <Flame className="w-7 h-7 text-primary group-hover:scale-90 transition-transform duration-300" />
                <span className="w-2 h-2 rounded-full bg-primary radar-pulse" />
              </div>
              <h4 className="font-display font-bold text-base text-white">Dynamic Decay</h4>
              <p className="font-body text-xs text-muted leading-relaxed">
                Challenge point values dynamically decay as more operatives solve the vector, rewarding early blood takers.
              </p>
            </div>

            <div className="cgs-card p-6 rounded-2xl border border-white/10 space-y-3 group hover:border-secondary/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <Server className="w-7 h-7 text-secondary group-hover:rotate-12 transition-transform duration-300" />
                <span className="w-2 h-2 rounded-full bg-secondary radar-pulse" />
              </div>
              <h4 className="font-display font-bold text-base text-white">Isolated Containers</h4>
              <p className="font-body text-xs text-muted leading-relaxed">
                Dedicated per-team Docker container instances ensuring zero cross-talk or flag stealing between competitors.
              </p>
            </div>

            <div className="cgs-card p-6 rounded-2xl border border-white/10 space-y-3 group hover:border-secondary/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <Radio className="w-7 h-7 text-secondary group-hover:animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-secondary radar-pulse" />
              </div>
              <h4 className="font-display font-bold text-base text-white">Real-Time Telemetry</h4>
              <p className="font-body text-xs text-muted leading-relaxed">
                Server-Sent Events (SSE) broadcasting instant scoreboard updates, announcement alerts, and first-blood toasts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA BAND ("Are You Ready to Hack the Arena?") */}
      <section className="py-24 relative overflow-hidden">
        {/* Ambient Drifting Radial Glow Blobs */}
        <div className="orb-red top-0 left-1/4 pointer-events-none" />
        <div className="orb-blue bottom-0 right-1/4 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="cgs-card rounded-3xl p-8 sm:p-14 border border-primary/30 shadow-glow-red relative overflow-hidden text-center space-y-8">
            <div className="cgs-scanline opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-transparent pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-xs font-body font-bold text-primary tracking-widest uppercase">
              <Lock className="w-3.5 h-3.5" />
              <span>CLASSIFIED OPERATIONAL PROTOCOL</span>
            </div>

            <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight max-w-2xl mx-auto leading-tight">
              ARE YOU READY TO <span className="text-gradient-cgs">HACK THE ARENA?</span>
            </h2>

            <p className="font-body text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
              Join hundreds of security researchers and ethical hackers worldwide in the ultimate cyber warfare battleground.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {/* Primary Red CTA Button */}
              <Link
                href="/auth/register"
                className="relative overflow-hidden inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary via-primary-glow to-violet text-white font-body text-sm font-bold shadow-glow-red hover:scale-105 transition-all charge-hover"
              >
                <span aria-hidden className="cgs-sweep" />
                <Zap className="w-4 h-4 fill-current relative z-10" />
                <span className="relative z-10">ENLIST AS OPERATIVE</span>
              </Link>

              {/* Secondary Blue Outline Button */}
              <Link
                href="/scoreboard"
                className="px-8 py-4 rounded-xl border border-secondary/40 bg-transparent text-secondary font-body text-sm font-semibold hover:bg-secondary/10 hover:border-secondary hover:shadow-glow-blue transition-all"
              >
                VIEW LIVE RANKINGS
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
