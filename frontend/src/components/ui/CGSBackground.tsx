"use client";

import React from "react";
import { usePathname } from "next/navigation";

type Variant = "default" | "challenge" | "scoreboard" | "submission";

function resolveVariant(pathname: string): Variant {
  if (pathname.startsWith("/challenges")) return "challenge";
  if (pathname.startsWith("/scoreboard")) return "scoreboard";
  if (pathname.startsWith("/submit")) return "submission";
  return "default";
}

/**
 * Global ambient background system.
 * Rendered once in the root layout behind all content.
 * Variants are resolved from the current route so every page shares
 * the same atmospheric language with slightly different lighting.
 */
export default function CGSBackground() {
  const pathname = usePathname();

  const variant = resolveVariant(pathname);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0f]">
      {/* Deep charcoal vignette base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(20, 22, 32, 0.9) 0%, rgba(10, 10, 15, 1) 62%)",
        }}
      />

      {/* Emerald atmosphere — top left */}
      <div
        className={`cgs-orb cgs-orb-a ${variant === "challenge" ? "w-[46rem] h-[46rem] -top-56 -left-40" : variant === "scoreboard" ? "w-[40rem] h-[40rem] -top-40 -left-32" : variant === "submission" ? "w-[38rem] h-[38rem] -top-32 -left-40" : "w-[42rem] h-[42rem] -top-52 -left-48"}`}
        style={{ background: "radial-gradient(circle, rgba(255, 23, 68, 0.14) 0%, transparent 65%)" }}
      />

      {/* Gold atmosphere — bottom right */}
      <div
        className={`cgs-orb cgs-orb-b ${variant === "scoreboard" ? "w-[44rem] h-[44rem] -bottom-44 -right-36" : variant === "challenge" ? "w-[40rem] h-[40rem] -bottom-48 -right-32" : variant === "submission" ? "w-[42rem] h-[42rem] -bottom-40 -right-40" : "w-[40rem] h-[40rem] -bottom-48 -right-44"}`}
        style={{ background: "radial-gradient(circle, rgba(0, 180, 255, 0.13) 0%, transparent 65%)" }}
      />

      {/* Cyan transition orb — center low */}
      <div
        className={`cgs-orb cgs-orb-c ${variant === "challenge" ? "w-[30rem] h-[30rem] top-1/3 left-1/2 -translate-x-1/2" : variant === "scoreboard" ? "w-[34rem] h-[34rem] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : "w-[28rem] h-[28rem] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"}`}
        style={{ background: "radial-gradient(circle, rgba(122, 92, 255, 0.08) 0%, transparent 60%)" }}
      />

      {/* Fine technical grid */}
      <div className="cgs-grid absolute inset-0" />

      {/* Film grain */}
      <div className="cgs-grain absolute inset-0" />

      {/* Variant-only accents */}
      {variant === "scoreboard" && (
        <div
          className="absolute top-0 left-0 right-0 h-64 opacity-40"
          style={{
            background:
              "linear-gradient(180deg, rgba(0, 180, 255, 0.05) 0%, rgba(255, 23, 68, 0.03) 55%, transparent 100%)",
          }}
        />
      )}
      {variant === "challenge" && (
        <div
          className="absolute top-0 left-0 right-0 h-80 opacity-50"
          style={{
            background:
              "linear-gradient(180deg, rgba(255, 23, 68, 0.05) 0%, rgba(122, 92, 255, 0.03) 60%, transparent 100%)",
          }}
        />
      )}
      {variant === "submission" && (
        <div
          className="absolute top-0 left-0 right-0 h-72 opacity-40"
          style={{
            background:
              "linear-gradient(180deg, rgba(0, 180, 255, 0.05) 0%, rgba(255, 23, 68, 0.025) 60%, transparent 100%)",
          }}
        />
      )}
    </div>
  );
}
