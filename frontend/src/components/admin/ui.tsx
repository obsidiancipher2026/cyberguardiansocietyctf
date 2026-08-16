"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { SmoothInput } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="font-body text-xs uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-panel rounded-2xl border border-danger/30 p-8 text-center">
      <p className="text-danger font-body text-sm mb-2">Request failed</p>
      <p className="text-muted text-xs font-mono">{message}</p>
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`glass-panel rounded-2xl border border-white/10 overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <i aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-primary to-secondary" />
          <div className="pl-2">
            {title && (
              <h3 className="flex items-center gap-2 font-display font-bold text-white text-sm tracking-wide">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ElementType;
  tone?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
}) {
  const tones: Record<string, string> = {
    primary: "text-primary from-primary/25 to-primary/[0.04] border-primary/30 shadow-[0_0_18px_rgba(255,23,68,0.12)]",
    secondary: "text-secondary from-secondary/25 to-secondary/[0.04] border-secondary/30 shadow-[0_0_18px_rgba(0,180,255,0.12)]",
    success: "text-success from-success/25 to-success/[0.04] border-success/30 shadow-[0_0_18px_rgba(0,180,255,0.12)]",
    warning: "text-warning from-warning/25 to-warning/[0.04] border-warning/30 shadow-[0_0_18px_rgba(255,107,107,0.12)]",
    danger: "text-danger from-danger/25 to-danger/[0.04] border-danger/30 shadow-[0_0_18px_rgba(255,23,68,0.12)]",
    neutral: "text-muted from-white/10 to-transparent border-white/15",
  };
  const accents: Record<string, string> = {
    primary: "from-primary/40",
    secondary: "from-secondary/40",
    success: "from-success/40",
    warning: "from-warning/40",
    danger: "from-danger/40",
    neutral: "from-white/25",
  };
  return (
    <div className="group relative glass-panel rounded-2xl border border-white/10 p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)]">
      <i aria-hidden className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${accents[tone]} to-transparent`} />
      <div className="relative flex items-center gap-3.5">
        {Icon && (
          <span
            className={`shrink-0 w-11 h-11 rounded-xl border bg-gradient-to-br flex items-center justify-center ${tones[tone]}`}
          >
            <Icon className="w-5 h-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-body text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="font-display font-black text-2xl text-white leading-none tabular-nums mt-1.5">{value}</p>
          {sub && <p className="text-[11px] text-muted mt-1.5 leading-snug truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";

export function BadgePill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    neutral: "bg-white/5 text-muted border-white/10",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-body font-semibold uppercase tracking-wider border ${map[tone]}`}>
      {children}
    </span>
  );
}

export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "success";
  size?: "sm" | "md" | "lg";
}) {
  const base = "inline-flex items-center justify-center gap-2 font-body font-semibold rounded-lg transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-2.5 py-1.5 text-[11px]", md: "px-4 py-2 text-xs", lg: "px-5 py-2.5 text-sm" };
  const variants = {
    primary: "bg-primary/15 border border-primary/30 text-primary hover:bg-primary hover:text-white",
    secondary: "bg-secondary/15 border border-secondary/30 text-secondary hover:bg-secondary hover:text-white",
    success: "bg-success/15 border border-success/30 text-success hover:bg-success hover:text-white",
    danger: "bg-danger/10 border border-danger/30 text-danger hover:bg-danger hover:text-white",
    ghost: "bg-transparent text-muted hover:text-white hover:bg-white/5 border border-transparent",
    outline: "bg-void-3 border border-white/10 text-white hover:border-primary/40 hover:bg-white/5",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-body font-semibold uppercase tracking-[0.16em] text-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full bg-void-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition";

const SMOOTH_CARET_TYPES = new Set(["text", "password", "email", "search", "url", "tel"]);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    const { className = "", type = "text", ...rest } = props;
    if (!SMOOTH_CARET_TYPES.has(type)) {
      return <input {...rest} ref={ref} type={type} className={`${inputCls} ${className}`} />;
    }
    return (
      <SmoothInput
        {...rest}
        ref={ref}
        type={type as "text" | "password" | "email" | "search" | "url" | "tel"}
        className="text-sm text-white placeholder:text-muted/50"
        wrapperClassName={`bg-void-2 border border-white/10 rounded-lg px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 ${className}`}
      />
    );
  }
);

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[90px] resize-y ${props.className ?? ""}`} />;
}

export function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={`${inputCls} ${props.className ?? ""}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-void-2">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`inline-flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed`}>
      <span
        className={`w-9 h-5 rounded-full relative transition-colors duration-200 border ${
          checked ? "bg-primary/70 border-primary/60" : "bg-white/5 border-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {label && <span className="text-xs text-muted">{label}</span>}
    </button>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  if (!eyebrow && !title && !description) {
    if (!actions) return null;
    return <div className="flex items-center justify-end gap-2 mb-4">{actions}</div>;
  }
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
      <div>
        <p className="font-body text-[10px] uppercase tracking-[0.24em] text-primary mb-1">{eyebrow}</p>
        <h2 className="font-display font-black text-2xl text-white tracking-tight">{title}</h2>
        {description && <p className="text-xs text-muted mt-1 max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function TableWrap({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="cgs-table w-full text-left">
        <thead>
          <tr className="border-b border-white/10">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-[10px] font-body font-semibold uppercase tracking-[0.14em] text-muted whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "", ...rest }: React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode }) {
  return (
    <td className={`px-3 py-3 text-xs text-ink align-middle ${className}`} {...rest}>
      {children}
    </td>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted">{title}</p>
      {description && <p className="text-xs text-muted/60 mt-1">{description}</p>}
    </div>
  );
}

export function Pagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5">
      <p className="text-[11px] text-muted">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <Btn size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </Btn>
        <Btn size="sm" variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Btn>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 26, rotateX: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 26, rotateX: 6 }}
            transition={{ type: "spring", stiffness: 340, damping: 28, mass: 0.9 }}
            className={`relative glass-panel rounded-2xl border border-white/10 w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[88vh] shadow-2xl origin-center flex flex-col`}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="font-display font-bold text-white text-sm">{title}</h3>
                {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="text-muted hover:text-white hover:bg-white/5 rounded-lg p-1.5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Close</TooltipContent>
              </Tooltip>
            </div>
            <ScrollArea className="flex-1 min-h-0" fadeClassName="from-void-3/90">
              <div className="p-5">{children}</div>
            </ScrollArea>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmBtn({
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  children,
  tone = "danger",
  disabled,
  size = "sm",
}: {
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  children: React.ReactNode;
  tone?: "danger" | "warning" | "primary" | "success";
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const toneMap = {
    danger: { border: "border-danger/30", text: "text-danger", hover: "hover:bg-danger hover:text-white" },
    warning: { border: "border-warning/30", text: "text-warning", hover: "hover:bg-warning hover:text-black" },
    primary: { border: "border-primary/30", text: "text-primary", hover: "hover:bg-primary hover:text-white" },
    success: { border: "border-success/30", text: "text-success", hover: "hover:bg-success hover:text-white" },
  };
  const t = toneMap[tone];
  return (
    <>
      <Btn size={size} variant="outline" disabled={disabled} onClick={() => setOpen(true)} className={`border ${t.border} ${t.text} ${t.hover}`}>
        {children}
      </Btn>
      {open && (
        <AnimatePresence>
          <motion.div
            key="confirm-popup"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 22 }}
              transition={{ type: "spring", stiffness: 360, damping: 27, mass: 0.9 }}
              className="relative glass-panel rounded-2xl border border-white/10 max-w-sm w-full p-5 shadow-2xl"
            >
              <p className="font-display font-bold text-white text-sm mb-2">Are you sure?</p>
              <p className="text-xs text-muted mb-5">This action requires {confirmText.toLowerCase()} to proceed.</p>
              <div className="flex items-center justify-end gap-2">
                <Btn size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  {cancelText}
                </Btn>
                <Btn
                  size="sm"
                  variant={tone === "danger" ? "danger" : tone === "success" ? "primary" : "outline"}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onConfirm();
                      setOpen(false);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmText}
                </Btn>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function usePolling(fn: () => void, intervalMs: number, active = true) {
  useEffect(() => {
    if (!active) return;
    fn();
    const id = window.setInterval(fn, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalMs]);
}
