"use client";

import React, { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface CountdownProps {
  targetDate?: string;
  className?: string;
}

export default function Countdown({ targetDate, className = "" }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: true,
  });

  useEffect(() => {
    // Target is reset to zero
    const target = targetDate
      ? new Date(targetDate).getTime()
      : Date.now() - 1;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true });
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isEnded: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Days */}
        <div className="flex-1 flex flex-col items-center bg-void-4/80 border border-white/10 rounded-xl p-2 sm:p-3 relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <AnimatedNumber
            value={pad(timeLeft.days)}
            className="font-display font-black text-lg sm:text-3xl lg:text-4xl text-white tracking-wider tabular-nums"
          />
          <span className="font-body text-[9px] sm:text-xs text-muted font-medium uppercase tracking-widest mt-0.5">
            DAYS
          </span>
        </div>

        <span className="font-display font-bold text-lg sm:text-2xl text-primary animate-pulse">:</span>

        {/* Hours */}
        <div className="flex-1 flex flex-col items-center bg-void-4/80 border border-white/10 rounded-xl p-2 sm:p-3 relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <AnimatedNumber
            value={pad(timeLeft.hours)}
            className="font-display font-black text-lg sm:text-3xl lg:text-4xl text-white tracking-wider tabular-nums"
          />
          <span className="font-body text-[9px] sm:text-xs text-muted font-medium uppercase tracking-widest mt-0.5">
            HOURS
          </span>
        </div>

        <span className="font-display font-bold text-lg sm:text-2xl text-primary animate-pulse">:</span>

        {/* Minutes */}
        <div className="flex-1 flex flex-col items-center bg-void-4/80 border border-white/10 rounded-xl p-2 sm:p-3 relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <AnimatedNumber
            value={pad(timeLeft.minutes)}
            className="font-display font-black text-lg sm:text-3xl lg:text-4xl text-white tracking-wider tabular-nums"
          />
          <span className="font-body text-[9px] sm:text-xs text-muted font-medium uppercase tracking-widest mt-0.5">
            MINS
          </span>
        </div>

        <span className="font-display font-bold text-lg sm:text-2xl text-primary animate-pulse">:</span>

        {/* Seconds */}
        <div className="flex-1 flex flex-col items-center bg-void-4/80 border border-white/10 rounded-xl p-2 sm:p-3 relative overflow-hidden group hover:border-secondary/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <AnimatedNumber
            value={pad(timeLeft.seconds)}
            className="font-display font-black text-lg sm:text-3xl lg:text-4xl text-secondary-glow tracking-wider tabular-nums"
          />
          <span className="font-body text-[9px] sm:text-xs text-muted font-medium uppercase tracking-widest mt-0.5">
            SECS
          </span>
        </div>
      </div>
    </div>
  );
}
