"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ArrowRight,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import UserMenu from "@/components/auth/UserMenu";
import { MaskedAvatars } from "@/components/ui/MaskedAvatars";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import AnimatedHamburger from "@/components/ui/AnimatedHamburger";

const publicNavLinks = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
];

const protectedNavLinks = [
  { name: "Announcements", href: "/announcements" },
  { name: "Challenges", href: "/challenges" },
  { name: "Scoreboard", href: "/scoreboard" },
  { name: "Submit Flag", href: "/submit" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const { isLoggedIn, bootstrap, setLoggedIn } = useAuth();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bootstrap auth state once on mount
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cgs_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.username) setUsername(parsed.username);
      }
    } catch {
      // ignore malformed cache
    }
  }, [isLoggedIn, pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("cgs_user");
      setLoggedIn(false);
      window.location.href = "/";
    }
  };

  const visibleNavLinks = isLoggedIn
    ? [...publicNavLinks, ...protectedNavLinks]
    : publicNavLinks;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* World-Class Floating Glass Navigation Bar */}
        <div
          className={`rounded-3xl border transition-all duration-300 overflow-hidden relative ${
            isScrolled
              ? "border-white/10 bg-void-2/90 backdrop-blur-2xl shadow-glass-lg"
              : "border-white/[0.08] bg-void-2/70 backdrop-blur-xl shadow-glass"
          }`}
        >
          <div className="flex items-center justify-between gap-6 px-5 sm:px-7 py-3">
            {/* LOGO */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                  <div className="relative">
                    <div
                      aria-hidden
                      className="absolute -inset-1.5 rounded-xl bg-gradient-to-r from-primary/25 to-secondary/25 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <Image
                      src="/cgs-logo.png"
                      alt="CGS Logo"
                      width={34}
                      height={34}
                      className="relative w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform duration-300"
                      priority
                    />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-display font-black text-lg sm:text-xl tracking-tight text-white">
                      CGS<span className="text-gradient-cgs">.CTF</span>
                    </span>
                    <span className="font-body text-[9px] text-muted-2 uppercase tracking-[0.25em] mt-0.5 hidden sm:block">
                      Cyber Guardian Society
                    </span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back to home</TooltipContent>
            </Tooltip>

            {/* DESKTOP NAV LINKS */}
            <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5">
              {visibleNavLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Tooltip key={link.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`relative rounded-xl px-3 py-2 font-body text-sm font-semibold tracking-wide transition-all duration-200 ${
                          active
                            ? "text-white"
                            : "text-muted hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="worldclass-nav-indicator"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/10"
                          />
                        )}
                        <span className="relative z-10">{link.name}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Go to {link.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>

            {/* AUTH BUTTONS */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {isLoggedIn ? (
                <>
                  <UserMenu username={username} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleLogout}
                        aria-label="Disconnect session"
                        className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all duration-300"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Disconnect session</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 bg-white/[0.02] text-white/90 font-body text-xs font-semibold hover:text-white hover:border-secondary/60 hover:bg-secondary/10 hover:shadow-glow-blue transition-all duration-300"
                  >
                    <span>Login</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>

                  <Link
                    href="/auth/register"
                    className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-body text-xs font-bold bg-gradient-to-r from-primary via-primary-glow to-violet shadow-glow-red hover:shadow-glow-red hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 charge-hover"
                  >
                    <span aria-hidden className="cgs-sweep" />
                    <Zap className="w-3.5 h-3.5 text-white fill-current relative z-10" />
                    <span className="relative z-10">Register</span>
                  </Link>
                </>
              )}
            </div>

            {/* MOBILE HAMBURGER BUTTON — visible on every screen below lg */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileOpen}
                  className="lg:hidden p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white hover:border-white/20 transition-colors"
                >
                  <AnimatedHamburger open={mobileOpen} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{mobileOpen ? "Close menu" : "Open menu"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER — slides in from the right */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                key="nav-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                key="nav-panel"
                initial={{ x: "105%" }}
                animate={{ x: 0 }}
                exit={{ x: "105%" }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                className="fixed right-0 top-0 bottom-0 z-[75] lg:hidden w-[min(19rem,88vw)] rounded-l-3xl border-l border-white/10 bg-void-2/98 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.7)] flex flex-col overflow-y-auto"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Image
                      src="/cgs-logo.png"
                      alt="CGS Logo"
                      width={30}
                      height={30}
                      className="w-7 h-7 object-contain"
                    />
                    <p className="font-display font-black text-sm text-white tracking-tight">
                      CGS<span className="text-gradient-cgs">.CTF</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="p-2 rounded-xl border border-white/10 bg-white/[0.03] text-muted hover:text-white hover:border-white/25 transition-colors"
                  >
                    <AnimatedHamburger open className="w-4 h-4" />
                  </button>
                </div>

                <nav aria-label="Mobile Navigation" className="p-4 space-y-1">
                  {visibleNavLinks.map((link) => {
                    const active =
                      pathname === link.href ||
                      (link.href !== "/" && pathname.startsWith(link.href));
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-xl px-4 py-3 font-body text-xs font-semibold transition-all ${
                          active
                            ? "bg-white/10 text-white border border-white/15"
                            : "text-muted hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {link.name}
                      </Link>
                    );
                  })}

                  {/* Mobile Auth Actions */}
                  <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
                    {isLoggedIn ? (
                      <>
                        <Link
                          href="/profile"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-secondary/40 bg-secondary/10 text-white font-body text-xs font-semibold"
                        >
                          <MaskedAvatars
                            avatars={[
                              {
                                avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(username ?? "Profile")}`,
                                name: username ?? "Profile",
                              },
                            ]}
                            size={38}
                            border={3}
                            column={24}
                            movement={0.55}
                            transition={0.22}
                            offset={-2}
                            ringed
                            blurOnRest
                          />
                          <span className="max-w-[120px] truncate">{username ?? "My Profile"}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-body text-xs font-semibold"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Disconnect Session</span>
                        </button>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        <Link
                          href="/auth/login"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 bg-white/[0.03] text-white font-body text-xs font-semibold"
                        >
                          <span>Login</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                        </Link>
                        <Link
                          href="/auth/register"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-body text-xs font-bold bg-gradient-to-r from-primary to-violet shadow-glow-red"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Register</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
