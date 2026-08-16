import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-body font-semibold rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-xs",
    lg: "px-7 py-3.5 text-sm",
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-primary to-primary-deep text-white shadow-glow-red hover:brightness-110 active:scale-95",
    secondary:
      "bg-gradient-to-r from-secondary to-secondary-deep text-white shadow-glow-blue hover:brightness-110 active:scale-95",
    danger:
      "bg-danger/20 border border-danger/40 text-danger hover:bg-danger hover:text-white active:scale-95",
    ghost: "bg-transparent text-muted hover:text-white hover:bg-white/5",
    outline:
      "bg-void-3 border border-white/10 text-white hover:border-primary/40 hover:bg-white/5",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
