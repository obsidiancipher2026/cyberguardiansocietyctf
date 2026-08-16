"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Wrench, ShieldAlert, RefreshCcw, ArrowLeft } from "lucide-react";
import { ADMIN_SLUG } from "@/lib/adminConfig";
import { getPublicJson } from "@/lib/publicData";

/**
 * Full-site lockdown overlay.
 * Polls the public competition endpoint; the moment maintenance mode is
 * switched on, every public page of the platform is replaced by the
 * maintenance screen. The admin vault keeps working.
 */
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<{
    on: boolean;
    message: string | null;
  } | null>(null);

  const isAdminRoute =
    typeof pathname === "string" && pathname.split("/").filter(Boolean)[0] === ADMIN_SLUG;

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const data = await getPublicJson<{
          maintenanceMode: boolean;
          maintenanceMessage?: string | null;
        }>("/public/competition");
        if (!mounted) return;
        if (!data) return;
        setMaintenance({
          on: Boolean(data.maintenanceMode),
          message: data.maintenanceMessage ?? null,
        });
      } catch {
        // Keep last known state on transient network failures.
      }
    };

    const onFocus = () => void check();

    void check();
    const timer = setInterval(check, 30_000);
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const locked = maintenance?.on && !isAdminRoute;

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key="maintenance-gate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-void px-4 py-16"
      role="alert"
      aria-live="assertive"
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ y: 24, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.1 }}
        className="relative w-full max-w-lg text-center space-y-7"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ repeat: Infinity, repeatDelay: 2.2, duration: 0.8 }}
          className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center shadow-glow-red"
        >
          <Wrench className="w-11 h-11 text-primary" />
        </motion.div>

        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 font-body text-[10px] font-bold uppercase tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5" />
            Scheduled Maintenance
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
            Platform Locked
          </h1>
          <p className="font-body text-sm text-muted max-w-md mx-auto leading-relaxed">
            {maintenance.message || "The Cyber Guardian Society platform is temporarily unavailable while we perform routine maintenance. Please stand by."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-secondary/40 bg-secondary/10 text-white font-body text-xs font-semibold hover:border-secondary hover:shadow-glow-blue transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-secondary" />
            Check again
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.location.href = "/";
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-muted hover:text-white hover:border-white/20 transition-all font-body text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go back
          </button>
        </div>

        <p className="font-body text-[10px] text-muted uppercase tracking-widest">
          Cyber Guardian Society · CGS CTF
        </p>
      </motion.div>
    </motion.div>
  );
}