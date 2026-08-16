"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle,
  ArrowUp,
  Radio,
  Shield,
  Terminal,
  Lock,
} from "lucide-react";
import { useAuth } from "@/store/auth";

/* ─────────────────────── Brand icons (inline SVGs) ─────────────────────── */


const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

/* ───────────────────────────── Data ───────────────────────────── */

const battlegroundLinks = [
  { label: "All Challenges", href: "/challenges" },
  { label: "Live Scoreboard", href: "/scoreboard" },
  { label: "Announcements", href: "/announcements" },
  { label: "Flag Submission", href: "/submit" },
];

const columns = [
  {
    title: "Warfare Domains",
    links: [
      { label: "Web Exploitation", href: "/challenges" },
      { label: "Binary Pwn", href: "/challenges" },
      { label: "Reverse Engineering", href: "/challenges" },
      { label: "Cryptography", href: "/challenges" },
      { label: "Forensics & OSINT", href: "/challenges" },
    ],
  },
  {
    title: "Protocols",
    links: [
      { label: "Zero-Trust Architecture", href: "/about" },
      { label: "Responsible Disclosure", href: "/about" },
      { label: "Rules of Engagement", href: "/about" },
    ],
  },
];

const socials = [
  {
    name: "WhatsApp",
    href: "https://chat.whatsapp.com/F6pOPqp7yCoGNYpEj8UKAT",
    icon: WhatsAppIcon,
    hoverClass: "hover:text-[#25D366] hover:border-[#25D366]/40 hover:bg-[#25D366]/10 hover:shadow-[0_0_20px_rgba(37,211,102,0.3)]",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/127073910",
    icon: LinkedInIcon,
    hoverClass: "hover:text-[#0A66C2] hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10 hover:shadow-[0_0_20px_rgba(10,102,194,0.3)]",
  },
];

/* ───────────────────────────── Component ───────────────────────── */

export default function Footer() {
  const { isLoggedIn } = useAuth();

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative z-20 mt-24 px-4 sm:px-8 pb-10 sm:pb-14 overflow-hidden">
      {/* ── Ambient background glows ── */}
      <div
        aria-hidden
        className="absolute bottom-8 left-1/4 w-[30rem] h-[20rem] bg-primary/8 rounded-full blur-[120px] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute bottom-8 right-1/4 w-[30rem] h-[20rem] bg-secondary/8 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ═══════════════════════════════════════════════════════
            GLASSMORPHISM OUTER SHELL
            ═══════════════════════════════════════════════════════ */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(13,15,22,0.55) 0%, rgba(18,21,31,0.45) 50%, rgba(13,15,22,0.55) 100%)",
            backdropFilter: "blur(40px) saturate(1.6)",
            WebkitBackdropFilter: "blur(40px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* ── Top gradient accent line ── */}
          <div className="h-[2px] w-full bg-gradient-to-r from-primary/80 via-violet/80 to-secondary/80" />

          {/* ── Frosted inner highlight at top ── */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-[2px] h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 70%, transparent 100%)",
            }}
          />

          {/* ═════ MAIN CONTENT ═════ */}
          <div className="px-8 sm:px-12 pt-12 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
              {/* ── Brand Column ── */}
              <div className="md:col-span-4 space-y-5">
                <Link href="/" className="inline-flex items-center gap-3 group">
                  <div className="relative">
                    <div
                      aria-hidden
                      className="absolute -inset-2 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    />
                    <Image
                      src="/cgs-logo.png"
                      alt="CGS Logo"
                      width={40}
                      height={40}
                      className="relative w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-display font-black text-xl text-white tracking-tight">
                      CGS<span className="text-gradient-cgs">.CTF</span>
                    </span>
                    <span className="font-body text-[9px] text-muted-2 uppercase tracking-[0.25em] mt-0.5">
                      Cyber Guardian Society
                    </span>
                  </div>
                </Link>

                <p className="font-body text-xs text-muted leading-relaxed max-w-[280px]">
                  A production-grade duotone capture-the-flag arena engineered
                  for elite cybersecurity operations and real-world offensive/defensive
                  training.
                </p>

                {/* ── Social Icons ── */}
                <div className="flex items-center gap-3 pt-1">
                  {socials.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      className={`w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-muted transition-all duration-300 hover:-translate-y-1 ${s.hoverClass}`}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <s.icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* ── Link Columns ── */}
              {/* Battleground column — only visible when logged in */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-display font-bold text-[11px] text-white uppercase tracking-[0.2em]">
                    Battleground
                  </h4>
                  <div className="h-[2px] w-7 bg-gradient-to-r from-primary to-secondary rounded-full" />
                </div>
                {isLoggedIn ? (
                  <ul className="space-y-3 font-body text-xs text-muted">
                    {battlegroundLinks.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="hover:text-white transition-colors duration-200 hover:translate-x-0.5 inline-block"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-1.5 font-body text-xs text-muted-2">
                    <Lock className="w-3 h-3 text-muted-2 shrink-0" />
                    <span>Login to access the arena</span>
                  </div>
                )}
              </div>

              {columns.map((col) => (
                <div key={col.title} className="md:col-span-2 space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[11px] text-white uppercase tracking-[0.2em]">
                      {col.title}
                    </h4>
                    <div className="h-[2px] w-7 bg-gradient-to-r from-primary to-secondary rounded-full" />
                  </div>
                  <ul className="space-y-3 font-body text-xs text-muted">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="hover:text-white transition-colors duration-200 hover:translate-x-0.5 inline-block"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* ── Community Column ── */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-display font-bold text-[11px] text-white uppercase tracking-[0.2em]">
                    Community
                  </h4>
                  <div className="h-[2px] w-7 bg-gradient-to-r from-primary to-secondary rounded-full" />
                </div>

                <ul className="space-y-3 font-body text-xs text-muted">
                  <li>
                    <a
                      href="https://chat.whatsapp.com/F6pOPqp7yCoGNYpEj8UKAT"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#25D366] transition-colors duration-200 hover:translate-x-0.5 inline-flex items-center gap-1.5"
                    >
                      <span>WhatsApp Group</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.linkedin.com/company/127073910"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#0A66C2] transition-colors duration-200 hover:translate-x-0.5 inline-flex items-center gap-1.5"
                    >
                      <span>LinkedIn Official</span>
                    </a>
                  </li>
                </ul>

                {/* Channel badge — inner glass card */}
                <a
                  href="https://chat.whatsapp.com/F6pOPqp7yCoGNYpEj8UKAT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-secondary/25 hover:border-secondary/50 hover:bg-secondary/10 transition-all duration-200"
                  style={{
                    background: "rgba(0,180,255,0.08)",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 0 20px rgba(0,180,255,0.1)",
                  }}
                >
                  <Radio className="w-3.5 h-3.5 text-secondary radar-pulse" />
                  <span className="font-mono text-xs text-secondary font-semibold">
                    #cgs-arena
                  </span>
                </a>

                {/* Status pill */}
                <div className="flex items-center gap-2 pt-0.5">
                  <Shield className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-mono text-[10px] text-muted-2 uppercase tracking-wider">
                    Secured Platform
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ═════ BOTTOM BAR — Inner frosted glass strip ═════ */}
          <div
            className="px-8 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(5,6,10,0.35) 0%, rgba(18,21,31,0.25) 100%)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            <p className="font-body text-xs text-muted-2">
              © 2026{" "}
              <span className="text-white font-medium">
                Cyber Guardian Society
              </span>{" "}
              · All rights reserved
            </p>

            <div className="flex items-center gap-5 flex-wrap justify-center">
              {/* Version */}
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-2">
                <Terminal className="w-3 h-3" />
                v1.4.0-PROD
              </span>

              {/* Operational Status */}
              <span className="inline-flex items-center gap-2 text-secondary font-mono text-[11px] font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
                </span>
                OPERATIONAL
              </span>

              {/* Back to top button */}
              <button
                type="button"
                onClick={scrollTop}
                aria-label="Back to top"
                className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-muted hover:text-white hover:border-primary/40 hover:bg-primary/10 transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <ArrowUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-xs font-body font-medium">Top</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
