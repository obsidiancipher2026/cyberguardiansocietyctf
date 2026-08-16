"use client";

import Link from "next/link";
import {
  Zap,
  Activity,
  Clock,
} from "lucide-react";
import LiveCompetitionCountdown from "@/components/ui/LiveCompetitionCountdown";
import { Terminal } from "@/components/ui/terminal";
import ParticleField from "@/components/ui/ParticleField";

export default function HeroPanel() {
  const runTerminalCommand = (raw: string): string | string[] | null => {
    const cmd = raw.trim().toLowerCase();
    if (cmd === "help") {
      return ["AVAILABLE COMMANDS: help, status, rules, domains, clear"];
    } else if (cmd === "status") {
      return ["ARENA STATUS: OPERATIONAL | 99.9% UPTIME | SSE TELEMETRY CONNECTED"];
    } else if (cmd === "rules") {
      return ["RULES: 1. No DDOS 2. Dynamic scoring active 3. Flag format: CGS{...}"];
    } else if (cmd === "domains") {
      return [
        "CATEGORIES: Web Exploitation, Reverse Engineering, Binary Exploitation, Cryptography, Digital Forensics, OSINT",
      ];
    } else if (cmd === "clear") {
      return null;
    }
    return [`Command not recognized: '${cmd}'. Type 'help' for available commands.`];
  };

  return (
    <section className="relative min-h-screen pt-28 pb-16 flex items-center overflow-hidden cyber-grid-bg">
      {/* Mouse-interactive particle field — hero background */}
      <ParticleField opacity={0.55} density={16000} />
      {/* Emerald & Gold Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-void/40 to-secondary/25 pointer-events-none" />
      {/* Dynamic Background Glow Blobs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-10 w-[30rem] h-[30rem] bg-secondary/15 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT COLUMN: WRITTEN CONTENT */}
          <div className="lg:col-span-6 flex flex-col items-center text-center lg:items-start lg:text-left space-y-6">
            
            {/* Headline in Cabinet Grotesk */}
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1]">
              NEXT-GEN <br />
              <span className="text-gradient-primary">CYBER WARFARE</span> <br />
              COMPETITION.
            </h1>

            {/* Description in Poppins */}
            <p className="font-body text-base sm:text-lg text-muted max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Infiltrate hardened containerized targets, exploit zero-day vulnerability vectors, and claim First Blood across Web, Binary Pwn, Reverse Engineering, Cryptography, and OSINT domains.
            </p>

            {/* CTA Buttons in Poppins */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 w-full sm:w-auto">
              <Link
                href="/challenges"
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary via-primary-glow to-primary-deep text-white font-body text-sm font-bold shadow-glow-red hover:shadow-glow-red-lg hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>ENTER ARENA</span>
              </Link>

              <Link
                href="/scoreboard"
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-void-3 border border-white/10 hover:border-secondary/40 text-white font-body text-sm font-semibold hover:bg-white/5 transition-all duration-200"
              >
                <Activity className="w-4 h-4 text-secondary" />
                <span>LIVE SCOREBOARD</span>
              </Link>
            </div>

          </div>

          {/* RIGHT COLUMN: CONSOLE + COUNTDOWN TIMER + TERMINAL */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* CONSOLE BOX ABOVE TERMINAL (HOUSES COUNTDOWN TIMER) */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Console Bar Header */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-success animate-ping shrink-0" />
                  <span className="font-display font-bold text-[10px] sm:text-xs uppercase tracking-widest text-white truncate">
                    MISSION TELEMETRY CONSOLE
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 font-body text-[11px] text-muted shrink-0">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>COUNTDOWN PROTOCOL</span>
                </div>
              </div>

              {/* Countdown Component inside Console */}
              <LiveCompetitionCountdown />

            </div>

            {/* ANIMATED TERMINAL BELOW CONSOLE */}
            <Terminal
              commands={["cgs-ctf --status", "cgs-ctf --domains", "cgs-ctf --help"]}
              outputs={{
                0: ["STATUS: ARENA ONLINE | ENCRYPTION: SHA-256 | TARGETS: 42 ACTIVE"],
                1: ["DOMAINS: Web | Pwn | Crypto | Forensics | Reversing | OSINT"],
                2: ["AVAILABLE COMMANDS: help, status, rules, domains, clear"],
              }}
              interactive
              onCommand={runTerminalCommand}
              typingSpeed={45}
              delayBetweenCommands={1500}
              placeholder="Type 'help' or 'status'..."
            />

          </div>

        </div>
      </div>
    </section>
  );
}
