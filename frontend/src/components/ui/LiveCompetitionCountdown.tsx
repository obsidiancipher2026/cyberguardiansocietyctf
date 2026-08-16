"use client";

import React, { useEffect, useState } from "react";
import Countdown from "@/components/ui/Countdown";
import { connectRealtime } from "@/lib/realtime";
import { getPublicJson } from "@/lib/publicData";

type CompetitionState = {
  status: string;
  startTime: string | null;
  endTime: string | null;
  name: string;
  now: string;
};

/**
 * Live mission countdown. Pulls the competition clock from the platform and
 * updates instantly when the organizers change it (SSE `competition` event).
 * - upcoming: counts down to the start
 * - live:     counts down to the end
 * - ended:    sits at zero
 */
export default function LiveCompetitionCountdown({ className = "" }: { className?: string }) {
  const [state, setState] = useState<CompetitionState | null>(null);
  const [target, setTarget] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const apply = (s: CompetitionState) => {
      if (!mounted) return;
      setState(s);
      if (s.status === "live" && s.endTime) setTarget(s.endTime);
      else if (s.status === "upcoming" && s.startTime) setTarget(s.startTime);
      else setTarget(undefined);
    };

    getPublicJson<CompetitionState>("/public/competition")
      .then((data) => data && apply(data))
      .catch(() => undefined);

    const off = connectRealtime((event, data) => {
      if (event === "competition" && data) apply(data);
    });

    return () => {
      mounted = false;
      off();
    };
  }, []);

  if (!state) {
    return (
      <div className="w-full text-center font-body text-[11px] text-muted py-4 uppercase tracking-widest">
        <span className="inline-block w-3 h-3 rounded-full bg-secondary/50 animate-pulse mr-2 align-middle" />
        Loading mission clock…
      </div>
    );
  }

  if (state.status === "ended" || !target) {
    return (
      <div className="w-full text-center font-body text-[11px] text-muted py-4 uppercase tracking-widest">
        <span className="inline-block w-3 h-3 rounded-full bg-warning/70 animate-pulse mr-2 align-middle" />
        {state.status === "ended" ? "Mission window closed — clock at zero" : "Awaiting countdown activation"}
      </div>
    );
  }

  return <Countdown targetDate={target} className={className} />;
}