"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";

type Phase = "idle" | "loading" | "success";

type StatefulButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * May return a promise. In uncontrolled mode the button shows its loading
   * animation while the promise is pending and flashes a success state once
   * it resolves.
   */
  onClick?: () => void | Promise<unknown>;
  /** External loading control (preferred for form submits). */
  loading?: boolean;
  /** External success pulse — flashes the success state once. */
  success?: boolean;
  loadingText?: string;
  successText?: string;
};

export function Button({
  onClick,
  loading: externalLoading,
  success: externalSuccess,
  loadingText = "Verifying…",
  successText = "Done",
  disabled,
  className = "",
  children,
  ...rest
}: StatefulButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const mounted = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      if (mounted.current) fn();
    }, ms);
    timers.current.push(id);
  }, []);

  // Controlled success pulse: any true value flashes once, then returns idle.
  useEffect(() => {
    if (externalLoading) return;
    if (externalSuccess && phase !== "loading") {
      setPhase("success");
      schedule(() => setPhase("idle"), 1600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalLoading, externalSuccess, schedule]);

  const loading = externalLoading !== undefined ? externalLoading : phase === "loading";
  const showSuccess = !loading && phase === "success";

  const handleClick = async () => {
    if (externalLoading !== undefined || disabled) return;
    if (!onClick) return;
    setPhase("loading");
    try {
      await onClick();
      if (!mounted.current) return;
      setPhase("success");
      schedule(() => setPhase("idle"), 1600);
    } catch {
      if (mounted.current) setPhase("idle");
    }
  };

  return (
    <button
      {...rest}
      onClick={() => void handleClick()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl font-body font-bold text-xs uppercase tracking-[0.14em] text-white bg-gradient-to-r from-primary via-primary-glow to-violet shadow-glow-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-all duration-300 hover:shadow-glow-red hover:-translate-y-0.5 hover:brightness-110 charge-hover ${
        loading ? "cursor-wait" : "disabled:opacity-40 disabled:cursor-not-allowed"
      } ${className}`}
    >
      {!loading && <span aria-hidden className="cgs-sweep" />}

      {/* Bottom progress sweep while loading */}
      {loading && (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-[3px] w-1/3 rounded-full bg-gradient-to-r from-transparent via-secondary to-white/90"
          initial={{ x: "-150%" }}
          animate={{ x: ["-150%", "400%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 inline-flex items-center gap-2"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              className="inline-flex"
            >
              <Loader2 className="w-4 h-4 text-white" />
            </motion.span>
            <span>{loadingText}</span>
          </motion.span>
        ) : showSuccess ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 inline-flex items-center gap-2"
          >
            <motion.span
              initial={{ scale: 0.4, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 16 }}
              className="inline-flex"
            >
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </motion.span>
            <span>{successText}</span>
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 inline-flex items-center gap-2"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
