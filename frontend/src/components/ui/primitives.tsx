"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import { deployContainer, deployItem } from "@/lib/motion";

/* ============================================================
   CGS UI PRIMITIVES — Duotone Red + Blue Design Language
   ============================================================ */

export function PageContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  );
}

export function PageHeader({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  gradientWord,
  description,
  align = "center",
  compact = false,
  children,
}: {
  eyebrow: string;
  eyebrowIcon?: React.ElementType;
  title: string;
  gradientWord?: string;
  description?: string;
  align?: "center" | "left";
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const centered = align === "center";
  return (
    <div className={`space-y-4 ${centered ? "text-center mx-auto max-w-2xl" : "max-w-3xl"}`}>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-primary relative overflow-hidden">
        {EyebrowIcon && <EyebrowIcon className="w-3.5 h-3.5" />}
        <span>{eyebrow}</span>
        <span aria-hidden className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-secondary" />
      </div>
      <h1 className={`font-display font-black text-white tracking-tight leading-[1.05] ${compact ? "text-2xl sm:text-4xl" : "text-3xl sm:text-5xl lg:text-6xl"}`}>
        {title}{" "}
        {gradientWord && <span className="text-gradient-cgs">{gradientWord}</span>}
      </h1>
      {description && (
        <p className="font-body text-sm sm:text-base text-muted leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

export function GradientText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`text-gradient-cgs ${className}`}>{children}</span>;
}

const badgeTones = {
  success: "text-secondary border-secondary/30 bg-secondary/10", // Signal Blue for verified/trust
  danger: "text-primary border-primary/30 bg-primary/10",        // Signal Red for alert/live
  warning: "text-warning border-warning/30 bg-warning/10",       // Amber for difficulty
  primary: "text-primary border-primary/30 bg-primary/10",       // Signal Red
  secondary: "text-secondary border-secondary/30 bg-secondary/10", // Signal Blue
  muted: "text-muted border-white/10 bg-white/[0.03]",
} as const;

export function StatusBadge({
  tone = "muted",
  dot = true,
  children,
  pulse = false,
  className = "",
}: {
  tone?: keyof typeof badgeTones;
  dot?: boolean;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  const dotColor: Record<string, string> = {
    success: "bg-secondary",
    danger: "bg-primary",
    warning: "bg-warning",
    primary: "bg-primary",
    secondary: "bg-secondary",
    muted: "bg-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-body text-[10px] font-bold uppercase tracking-wider ${badgeTones[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColor[tone]} ${
            pulse ? "radar-pulse" : ""
          }`}
        />
      )}
      {children}
    </span>
  );
}

/* Domain Pill strictly mapped to domain colors */
export const domainMap: Record<string, { label: string; color: string; dot: string }> = {
  web: { label: "Web", color: "text-secondary bg-secondary/10 border-secondary/30", dot: "bg-secondary" },
  pwn: { label: "Pwn", color: "text-primary bg-primary/10 border-primary/30", dot: "bg-primary" },
  crypto: { label: "Crypto", color: "text-violet bg-violet/10 border-violet/30", dot: "bg-violet" },
  forensics: { label: "Forensics", color: "text-secondary bg-secondary/10 border-secondary/30", dot: "bg-secondary" },
  reversing: { label: "Reversing", color: "text-primary bg-primary/10 border-primary/30", dot: "bg-primary" },
  osint: { label: "OSINT", color: "text-secondary bg-secondary/10 border-secondary/30", dot: "bg-secondary" },
  misc: { label: "Misc", color: "text-violet bg-violet/10 border-violet/30", dot: "bg-violet" },
};

export function DomainBadge({ category }: { category: string }) {
  const meta = domainMap[category.toLowerCase()] ?? domainMap.misc;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-body text-[9px] font-bold uppercase tracking-wider ${meta.color}`}>
      <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "text-primary",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="cgs-card px-4 py-3.5 flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-display font-black text-xl text-white leading-none truncate" title={typeof value === "string" ? value : undefined}>{value}</p>
        <p className="font-body text-[9px] text-muted-2 uppercase tracking-[0.18em] mt-1 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  kicker,
  icon: Icon,
  right,
}: {
  title: string;
  kicker?: string;
  icon?: React.ElementType;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-secondary/15 border border-white/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </span>
        )}
        <div>
          {kicker && (
            <p className="font-body text-[9px] text-muted-2 uppercase tracking-[0.24em]">
              {kicker}
            </p>
          )}
          <h2 className="font-display font-bold text-lg text-white tracking-tight">{title}</h2>
        </div>
      </div>
      {right}
    </div>
  );
}

export function CommandButton({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
}) {
  const base =
    "relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl font-body font-bold text-xs uppercase tracking-[0.14em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-40 disabled:cursor-not-allowed";
  
  const styles = {
    primary:
      "px-6 py-3.5 text-white bg-gradient-to-r from-primary via-primary-glow to-violet shadow-glow-red hover:shadow-glow-red hover:-translate-y-0.5 hover:brightness-110 charge-hover",
    secondary:
      "px-6 py-3.5 text-secondary border border-secondary/40 bg-transparent hover:bg-secondary/10 hover:border-secondary hover:shadow-glow-blue hover:-translate-y-0.5",
    outline:
      "px-6 py-3.5 text-secondary border border-secondary/40 bg-transparent hover:bg-secondary/10 hover:border-secondary hover:shadow-glow-blue hover:-translate-y-0.5",
  } as const;

  return (
    <button {...rest} className={`${base} ${styles[variant]} ${className}`}>
      {variant === "primary" && <span aria-hidden className="cgs-sweep" />}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

export function AnimatedNumber({
  value,
  className = "",
  format,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);

  return <span className={className}>{format ? format(display) : display.toLocaleString()}</span>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-dashed border-white/12 bg-white/[0.015] px-6 py-10 text-center space-y-3"
    >
      <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto">
        <Icon className="w-5 h-5 text-muted" />
      </div>
      <h3 className="font-display font-bold text-base text-white">{title}</h3>
      <p className="font-body text-xs text-muted max-w-sm mx-auto leading-relaxed">{description}</p>
      {action}
    </motion.div>
  );
}

export function SecurityStrip({ items }: { items: { label: string; icon: React.ElementType }[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-4">
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <span aria-hidden className="hidden sm:block w-px h-4 bg-white/10" />}
          <span className="inline-flex items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <item.icon className="w-3.5 h-3.5 text-secondary" />
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

export { deployContainer as stagger, deployItem as fadeUp };
