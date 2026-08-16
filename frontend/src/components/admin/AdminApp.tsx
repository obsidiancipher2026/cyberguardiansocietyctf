"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Target,
  Megaphone,
  Zap,
  ScrollText,
  Database,
  ShieldCheck,
  Settings,
  LogOut,
  Lock,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/store/adminAuth";
import AdminLogin from "./AdminLogin";
import Dashboard from "./sections/Dashboard";
import UsersSection from "./sections/Users";
import ChallengesSection from "./sections/Challenges";
import AnnouncementsSection from "./sections/Announcements";
import LiveControl from "./sections/LiveControl";
import LogsSection from "./sections/Logs";
import SubmissionsSection from "./sections/Submissions";
import SecuritySection from "./sections/Security";
import SettingsSection from "./sections/Settings";
import { Spinner } from "./ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import AnimatedHamburger from "@/components/ui/AnimatedHamburger";
import ParticleField from "@/components/ui/ParticleField";

export type AdminSectionKey =
  | "dashboard"
  | "users"
  | "challenges"
  | "announcements"
  | "live"
  | "logs"
  | "submissions"
  | "security"
  | "settings";

const SECTIONS: {
  key: AdminSectionKey;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: Dashboard },
  { key: "users", label: "User Management", icon: Users, component: UsersSection },
  { key: "challenges", label: "Challenge Management", icon: Target, component: ChallengesSection },
  { key: "announcements", label: "Announcements", icon: Megaphone, component: AnnouncementsSection },
  { key: "live", label: "Live Control", icon: Zap, component: LiveControl },
  { key: "logs", label: "Logs", icon: ScrollText, component: LogsSection },
  { key: "submissions", label: "Submission Logs", icon: Database, component: SubmissionsSection },
  { key: "security", label: "Security", icon: ShieldCheck, component: SecuritySection },
  { key: "settings", label: "Settings", icon: Settings, component: SettingsSection },
];

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const NAV_GROUPS: { label: string; keys: AdminSectionKey[] }[] = [
  { label: "Command", keys: ["dashboard"] },
  { label: "Management", keys: ["users", "challenges", "announcements", "submissions"] },
  { label: "Operations", keys: ["live", "logs"] },
  { label: "System", keys: ["security", "settings"] },
];

function AdminSidebar({
  section,
  setSection,
  onNavigate,
  admin,
  logout,
}: {
  section: AdminSectionKey;
  setSection: (s: AdminSectionKey) => void;
  onNavigate?: () => void;
  admin: { username: string };
  logout: () => void;
}) {
  const go = (key: AdminSectionKey) => {
    setSection(key);
    onNavigate?.();
  };
  return (
    <>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full" fadeClassName="from-void-2" fadeSize="h-6">
          <div className="px-3 py-5 space-y-4">
            {NAV_GROUPS.map((g) => (
              <div key={g.label}>
                <p className="px-3 mb-1.5 font-mono text-[8px] uppercase tracking-[0.3em] text-muted/40">
                  {g.label}
                </p>
                <div className="space-y-0.5">
                  {g.keys.map((key) => {
                    const s = SECTIONS.find((x) => x.key === key)!;
                    const Icon = s.icon;
                    const activeKey = section === key;
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => go(key)}
                            className={`relative w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-xs font-body font-semibold transition-all duration-200 ${
                              activeKey
                                ? "bg-gradient-to-r from-primary/15 via-violet/10 to-transparent text-white border border-primary/20 shadow-[0_0_20px_rgba(255,23,68,0.12)]"
                                : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                          >
                            {activeKey && (
                              <i
                                aria-hidden
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-secondary"
                              />
                            )}
                            <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${activeKey ? "text-secondary" : ""}`} />
                            <span className="truncate">{s.label}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Open {s.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Admin footer */}
      <div className="relative px-4 py-4 border-t border-white/10 space-y-3">
        <i aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-violet to-secondary" />
        <div className="flex items-center gap-2.5 px-1">
          <span className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 border border-secondary/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-4 9.57c-.29-.47-1.06-.47-1.35 0L5 18.76l1.78 3.17c.48.85 1.5 1.35 2.64.55L18.5 15.57c.93-.67 1.1-1.95.47-2.81z"/>
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">{admin.username}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider">Vault Administrator</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-danger/30 bg-danger/[0.06] text-danger text-[11px] font-semibold hover:bg-danger hover:text-white hover:shadow-[0_0_20px_rgba(255,23,68,0.35)] transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Lock session
        </button>
        <p className="text-center text-[8px] font-body uppercase tracking-[0.24em] text-muted/50 flex items-center justify-center gap-1">
          <Lock className="w-2.5 h-2.5" /> 15 min auto-lock · All actions audited
        </p>
      </div>
    </>
  );
}

export default function AdminApp() {
  const { status, admin, bootstrap, logout } = useAdminAuth();
  const [section, setSection] = useState<AdminSectionKey>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_TIMEOUT_MS) {
        toast("Vault locked due to inactivity", { icon: "🔒" });
        logout();
      }
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(timer);
    };
  }, [status, logout]);

  // Close the mobile drawer when the viewport grows past the breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  // Prevent body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  if (status === "unknown") {
    return <Spinner label="Verifying session" />;
  }

  if (status !== "authenticated" || !admin) {
    return <AdminLogin />;
  }

  const active = SECTIONS.find((s) => s.key === section)!;
  const ActiveComponent = active.component;

  return (
    <div className="min-h-screen bg-void text-ink antialiased">
      {/* Mouse-interactive particles across the entire admin panel */}
      <ParticleField className="fixed inset-0" opacity={0.4} density={18000} />
      <div className="flex min-h-screen relative z-10">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-60 rounded-3xl bg-void-2/95 backdrop-blur flex-col z-30">
          <AdminSidebar section={section} setSection={setSection} admin={admin} logout={logout} />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.aside
                key="drawer-panel"
                initial={{ x: "105%" }}
                animate={{ x: 0 }}
                exit={{ x: "105%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-[min(19rem,88vw)] rounded-l-3xl bg-void-2/98 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.7)] lg:hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <p className="font-display font-black text-sm text-white tracking-tight">
                    CGS<span className="text-gradient-cgs">.VAULT</span>
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setMobileNavOpen(false)}
                        aria-label="Close navigation"
                        className="p-2 rounded-lg border border-white/10 bg-white/[0.03] text-muted hover:text-white hover:border-white/25 transition-colors"
                      >
                        <AnimatedHamburger open className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Close navigation</TooltipContent>
                  </Tooltip>
                </div>
                <AdminSidebar
                  section={section}
                  setSection={setSection}
                  onNavigate={() => setMobileNavOpen(false)}
                  admin={admin}
                  logout={logout}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 lg:ml-[16.5rem] min-w-0">
          {/* Mobile top bar */}
          <div className="lg:hidden sticky top-0 z-30 px-4 pt-4">
            <div className="glass-panel rounded-2xl border border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-2xl">
              <p className="font-display font-black text-sm text-white tracking-tight">
                CGS<span className="text-gradient-cgs">.VAULT</span>
              </p>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-muted hover:text-white hover:border-white/25 transition-colors"
              >
                <AnimatedHamburger open={mobileNavOpen} className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Menu</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-6">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <ActiveComponent />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}