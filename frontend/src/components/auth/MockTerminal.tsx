"use client";

import React, { useEffect, useState } from "react";

const LINES = [
  { prefix: ">", text: "establishing secure uplink…", tone: "text-muted" },
  { prefix: "[ OK ]", text: "cipher negotiated: AES-256-GCM", tone: "text-secondary" },
  { prefix: "[ OK ]", text: "operative identity verified", tone: "text-secondary" },
  { prefix: "[ OK ]", text: "challenge manifest decrypted", tone: "text-secondary" },
  { prefix: "[ OK ]", text: "scoreboard feed: live", tone: "text-secondary" },
  { prefix: "[ ! ]", text: "tip: never reuse passphrases across battlegrounds", tone: "text-primary" },
];

export default function MockTerminal() {
  const [done, setDone] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (current >= LINES.length) {
      const t = setTimeout(() => {
        setDone([]);
        setCurrent(0);
        setChars(0);
      }, 4000);
      return () => clearTimeout(t);
    }
    const line = LINES[current].text;
    if (chars < line.length) {
      const t = setTimeout(() => setChars((c) => c + 1), 12 + Math.random() * 24);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setDone((d) => [...d, current]);
      setCurrent((c) => c + 1);
      setChars(0);
    }, 320);
    return () => clearTimeout(t);
  }, [current, chars]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-void-2/80">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
        <span className="w-2.5 h-2.5 rounded-full bg-primary/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-secondary/70" />
        <span className="ml-2 font-mono text-[10px] text-muted-2 uppercase tracking-widest">
          uplink.log — live
        </span>
      </div>
      <div className="relative px-4 py-3.5 space-y-1.5 font-mono text-[10.5px] leading-relaxed">
        <div aria-hidden className="cgs-scanline" />
        {done.map((idx) => (
          <p key={idx} className={LINES[idx].tone}>
            <span className="text-muted-2">{LINES[idx].prefix}</span> {LINES[idx].text}
          </p>
        ))}
        {current < LINES.length && (
          <p className={LINES[current].tone}>
            <span className="text-muted-2">{LINES[current].prefix}</span>{" "}
            {LINES[current].text.slice(0, chars)}
            <span
              aria-hidden
              className="inline-block w-1.5 h-3 bg-primary/80 animate-pulse align-middle ml-0.5"
            />
          </p>
        )}
      </div>
    </div>
  );
}