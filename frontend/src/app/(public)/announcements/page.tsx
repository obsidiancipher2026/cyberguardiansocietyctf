"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Bell,
  Pin,
  Shield,
  Radio,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { deployContainer, deployItem } from "@/lib/motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type Announcement = {
  id: number;
  title: string;
  date: string;
  pinned: boolean;
  author: string;
  content: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+|\/[a-zA-Z0-9\-_./?=&%+#]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-secondary font-semibold underline decoration-secondary/40 underline-offset-4 hover:text-secondary-light transition-colors"
            >
              {part}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          );
        }
        if (/^\/[a-zA-Z0-9\-_./?=&%+#]+/.test(part)) {
          return (
            <Link
              key={i}
              href={part}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-primary font-semibold underline decoration-primary/40 underline-offset-4 hover:text-primary-light transition-colors"
            >
              {part}
              <ChevronRight className="w-3 h-3 shrink-0" />
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [active, setActive] = useState<Announcement | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/announcements");
      const items: Announcement[] = (res.data.announcements ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        pinned: Boolean(a.isPinned),
        author: a.author ?? "CGS CTF Staff",
        date: formatDate(a.publishedAt ?? a.createdAt),
      }));
      setAnnouncements(items);
    } catch {
      /* keep previous list on transient errors */
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const closeModal = React.useCallback(() => {
    if (!active) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setActive(null);
      setClosing(false);
    }, 300);
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal]);

  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [active]);

  const toggleExpand = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <ProtectedRoute>
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-body font-semibold text-primary">
          <Radio className="w-3.5 h-3.5 radar-pulse" />
          <span>BROADCAST TELEMETRY</span>
        </div>
        <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
          OFFICIAL <span className="text-gradient-cgs">ANNOUNCEMENTS</span>
        </h1>
        <p className="font-body text-sm text-muted">
          Real-time event broadcasts, challenge releases, infrastructure updates, and operational notices.
        </p>
      </div>

      {/* Announcement Transmission Cards Feed */}
      <motion.div
        variants={deployContainer}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {announcements.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No announcements broadcasted yet.</div>
        ) : (
          announcements.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const isLatest = idx === 0;

            return (
              <motion.div
                key={item.id}
                variants={deployItem}
                className="relative overflow-hidden"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Open announcement: ${item.title}`}
                  onClick={() => setActive(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActive(item);
                    }
                  }}
                  className={`w-full text-left cgs-card rounded-xl border transition-all duration-300 cursor-pointer group relative ${
                    item.pinned
                      ? "border-primary/40 bg-primary/5 hover:border-primary/70 shadow-glow-red"
                      : "border-white/10 hover:border-secondary/40 hover:shadow-glow-blue"
                  } hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60`}
                >
                  {/* Signal Accent Left Border Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      item.pinned ? "bg-primary" : "bg-secondary"
                    }`}
                  />

                  {/* Latest Transmission Flash Overlay */}
                  {isLatest && (
                    <div aria-hidden className="cgs-sweep opacity-40" />
                  )}

                  <div className="p-5 sm:p-6 space-y-3 pl-6">
                    {/* Top Bar: Title & Monospace Date */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.pinned && (
                          <motion.div
                            initial={{ y: -8 }}
                            animate={{ y: 0 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <Pin className="w-3.5 h-3.5 text-primary fill-current shrink-0" />
                          </motion.div>
                        )}
                        <h3 className="font-display font-bold text-base sm:text-lg text-white truncate group-hover:text-white transition-colors">
                          {item.title}
                        </h3>
                      </div>
                      <span className="font-mono text-xs text-muted-2 shrink-0">
                        {item.date}
                      </span>
                    </div>

                    {/* Body Content with Accordion Expand */}
                    <div className="relative font-body text-xs text-ink-2 leading-relaxed">
                      <div className={isExpanded ? "" : "line-clamp-2"}>
                        <Linkify text={item.content} />
                      </div>

                      {!isExpanded && item.content.length > 140 && (
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(e, item.id)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-secondary hover:underline"
                        >
                          <span>Read full transmission</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Footer Strip: Author & SHA-256 Signal Blue Verified Badge */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between font-body text-xs text-muted-2">
                      <span className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-muted group-hover:animate-bounce" />
                        Broadcasted by: <strong className="text-white font-semibold">{item.author}</strong>
                      </span>

                      {/* SHA-256 Verified in Signal Blue */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-secondary/30 bg-secondary/10 text-secondary font-body text-[10px] font-bold uppercase tracking-wider">
                        <Shield className="w-3 h-3 text-secondary" />
                        SHA-256 Verified
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Modal Dialog for Full Detail View — rendered via portal so the
          page-transition transform cannot break its fixed positioning on
          small screens */}
      {typeof document !== "undefined" &&
        createPortal(
        <AnimatePresence>
          {active && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/90 backdrop-blur-md"
              onClick={closeModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-hairline bg-void-2 shadow-glass-lg z-10"
            >
              <div className="cgs-hairline" />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {active.pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-[10px] font-bold text-primary uppercase tracking-wider">
                        <Pin className="w-3 h-3 fill-current" />
                        Pinned
                      </span>
                    )}
                    <span className="font-mono text-xs text-muted">
                      {active.date}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-white mt-2">
                    {active.title}
                  </h2>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={closeModal}
                      aria-label="Close announcement"
                      className="shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted transition-all duration-300 hover:text-white hover:border-primary/50 hover:bg-primary/10 hover:shadow-glow-red"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Close</TooltipContent>
                </Tooltip>
              </div>

              {/* Modal Body */}
              <ScrollArea className="flex-1 min-h-0" fadeClassName="from-void-2" fadeSize="h-6">
                <div className="px-6 py-6 space-y-4 font-body text-sm text-ink-2 leading-relaxed">
                  <p>
                    <Linkify text={active.content} />
                  </p>
                </div>
              </ScrollArea>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between font-body text-xs text-muted-2 bg-void-3/50 shrink-0">
                <span>
                  Broadcasted by: <strong className="text-white">{active.author}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-secondary/30 bg-secondary/10 text-secondary font-body text-[10px] font-bold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5" />
                  SHA-256 Verified
                </span>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
    </ProtectedRoute>
  );
}