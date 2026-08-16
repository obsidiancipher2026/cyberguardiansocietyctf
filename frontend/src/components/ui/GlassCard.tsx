import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export function GlassCard({
  children,
  hoverEffect = true,
  className = "",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`glass-panel rounded-2xl p-6 border border-white/10 ${
        hoverEffect ? "glass-panel-hover" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
