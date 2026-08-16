"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Eye, EyeOff } from "lucide-react";
import { SmoothInput } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export type AuthAccent = "primary" | "secondary";

interface AuthLabelProps {
  id: string;
  label: string;
}

function AuthLabel({ id, label }: AuthLabelProps) {
  return (
    <label htmlFor={id} className="block text-muted mb-1.5 font-medium">
      {label}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 mt-1.5 text-[10px] leading-snug text-danger font-medium">
      <AlertCircle className="w-3 h-3 shrink-0 mt-[1px]" />
      {message}
    </p>
  );
}

function borderClass(accent: AuthAccent, error: boolean, valid: boolean): string {
  if (error) return "border-danger/60 focus:border-danger";
  if (valid) return "border-success/40 focus:border-success/60";
  return accent === "primary"
    ? "border-white/10 focus:border-primary/40"
    : "border-white/10 focus:border-secondary/40";
}

export interface AuthFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string | null;
  valid?: boolean;
  accent?: AuthAccent;
  /** Adds a show/hide toggle (use with type="password"). */
  showToggle?: boolean;
}

export function AuthField({
  label,
  error,
  valid = false,
  accent = "primary",
  showToggle = false,
  type = "text",
  ...rest
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const errorMsg = error ?? null;
  const resolvedType =
    showToggle && type === "password" ? (revealed ? "text" : "password") : type;

  return (
    <div>
      <AuthLabel id={rest.id ?? ""} label={label} />
      <div className="relative">
        <SmoothInput
          {...rest}
          id={rest.id}
          type={resolvedType as "text" | "password"}
          aria-invalid={Boolean(errorMsg)}
          aria-describedby={errorMsg ? `${rest.id}-error` : undefined}
          className={`text-white text-xs placeholder:text-muted-2 ${valid && !errorMsg && !showToggle ? "pr-9" : ""} ${showToggle ? "pr-9" : ""}`}
          wrapperClassName={`bg-void-4 border rounded-xl px-4 py-3 transition-colors ${borderClass(accent, Boolean(errorMsg), valid).replace(/focus:/g, "focus-within:")}`}
        />
        {valid && !errorMsg && !showToggle && (
          <CheckCircle2
            aria-hidden
            className="w-4 h-4 text-success absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        )}
        {showToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                tabIndex={-1}
                aria-label={revealed ? "Hide passphrase" : "Show passphrase"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-white transition-colors"
              >
                {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{revealed ? "Hide passphrase" : "Show passphrase"}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {errorMsg && (
        <div id={`${rest.id}-error`}>
          <FieldError message={errorMsg} />
        </div>
      )}
    </div>
  );
}

export interface AuthSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label: string;
  error?: string | null;
  valid?: boolean;
  accent?: AuthAccent;
  options: string[];
  placeholder?: string;
}

export function AuthSelect({
  label,
  error,
  valid = false,
  accent = "secondary",
  options,
  placeholder = "Select an option",
  ...rest
}: AuthSelectProps) {
  const errorMsg = error ?? null;
  const hasValue = String(rest.value ?? "").length > 0;

  return (
    <div>
      <AuthLabel id={rest.id ?? ""} label={label} />
      <div className="relative">
        <select
          {...rest}
          id={rest.id}
          aria-invalid={Boolean(errorMsg)}
          aria-describedby={errorMsg ? `${rest.id}-error` : undefined}
          className={`w-full appearance-none bg-void-4 border rounded-xl px-4 py-3 pr-10 text-xs focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer ${
            hasValue ? "text-white" : "text-muted-2"
          } ${borderClass(accent, Boolean(errorMsg), valid)}`}
        >
          <option value="" disabled className="bg-void-3 text-muted-2">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-void-3 text-white">
              {option}
            </option>
          ))}
        </select>
        {valid && !errorMsg && (
          <CheckCircle2
            aria-hidden
            className="w-4 h-4 text-success absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        )}
        <ChevronDown
          aria-hidden
          className="w-4 h-4 text-muted-2 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>
      {errorMsg && (
        <div id={`${rest.id}-error`}>
          <FieldError message={errorMsg} />
        </div>
      )}
    </div>
  );
}
