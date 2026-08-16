"use client";

import React from "react";
import { checkPassword } from "@/lib/validation";

const STRENGTH_META = {
  weak: { label: "Weak", bar: "bg-danger", text: "text-danger" },
  medium: { label: "Medium", bar: "bg-warning", text: "text-warning" },
  strong: { label: "Strong", bar: "bg-success", text: "text-success" },
} as const;

export function PasswordStrength({
  value,
  visible,
}: {
  value: string;
  visible: boolean;
}) {
  if (!visible || value.length === 0) return null;

  const check = checkPassword(value);
  const meta = STRENGTH_META[check.strength];
  const filled = check.strength === "weak" ? 1 : check.strength === "medium" ? 2 : 3;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1 flex-1" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= filled ? meta.bar : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.text}`}>
          {meta.label}
        </span>
      </div>
      {check.missingActions.length > 0 && (
        <ul className="space-y-1">
          {check.missingActions.map((action) => (
            <li
              key={action}
              className="flex items-center gap-1.5 text-[10px] text-muted leading-snug"
            >
              <span aria-hidden className="w-1 h-1 rounded-full bg-danger/70 shrink-0" />
              {action}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
