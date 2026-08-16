"use client";

import React from "react";
import { useToaster, resolveValue, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { AnimatedList } from "@/registry/magicui/animated-list";

const TYPES: Record<
  string,
  { icon: React.ComponentType<{ className?: string }> | null; color: string; label: string }
> = {
  success: { icon: CheckCircle2, color: "#00B4FF", label: "OPERATION SUCCESS" },
  error: { icon: XCircle, color: "#FF1744", label: "SYSTEM ALERT" },
  loading: { icon: Loader2, color: "#7A5CFF", label: "PROCESSING" },
  blank: { icon: AlertTriangle, color: "#B9BFD4", label: "NOTIFICATION" },
  custom: { icon: null, color: "#7A5CFF", label: "TRANSMISSION" },
};

const spring = { type: "spring", stiffness: 380, damping: 30, mass: 0.9 } as const;

export default function ToastProvider() {
  const { toasts, handlers } = useToaster({ duration: 4000 });

  return (
    <AnimatedList className="fixed top-3 right-3 z-[9999] items-stretch w-[calc(100vw-1.5rem)] max-w-[24rem] pointer-events-none sm:top-4 sm:right-4">
      {toasts.map((t) => {
        const custom = t.type === "custom";
        const message = resolveValue(t.message, t);
        const meta = TYPES[t.type] ?? TYPES.blank;
        const Icon = meta.icon;
        return (
          <AnimatePresence key={t.id}>
            {t.visible && (
              <motion.div
                layout
                initial={{ opacity: 0, y: -24, scale: 0.97, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 72, scale: 0.9, filter: "blur(8px)" }}
                transition={spring}
                onMouseEnter={handlers.startPause}
                onMouseLeave={handlers.endPause}
                onClick={() => toast.dismiss(t.id)}
                role={t.ariaProps.role}
                aria-live={t.ariaProps["aria-live"]}
                className="pointer-events-auto relative w-full max-w-[400px] mx-auto min-h-fit overflow-hidden rounded-2xl p-3.5 transition-all duration-200 hover:scale-[103%] cursor-pointer transform-gpu bg-void-3/95 backdrop-blur-xl dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] border border-white/10 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.75)]"
              >
                <i
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${meta.color}, transparent)` }}
                />
                <div className="flex flex-row items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-xl shrink-0"
                    style={{ backgroundColor: meta.color, boxShadow: `0 0 18px ${meta.color}55` }}
                  >
                    {custom ? (
                      <span className="text-lg text-white">
                        {(t.icon as React.ReactNode) ?? <AlertTriangle className="w-4 h-4" />}
                      </span>
                    ) : Icon ? (
                      <Icon className="w-4 h-4 text-white" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <figcaption className="flex flex-row items-center whitespace-pre text-ink">
                      <span className="text-[13px] font-semibold text-white truncate">
                        {custom ? message : (message as string)}
                      </span>
                      <span className="mx-1.5 text-muted-2">·</span>
                      <span className="text-[10px] text-muted-2 shrink-0">now</span>
                    </figcaption>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                      {meta.label}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}
    </AnimatedList>
  );
}
