"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon } from "lucide-react";

type TerminalLine = {
  id: number;
  command: string;
  output: string[];
};

type TerminalProps = {
  /** Commands that play automatically on mount, in order. */
  commands: string[];
  /** Output lines to reveal after each auto command (keyed by index). */
  outputs?: Record<number, string[]>;
  /** Milliseconds per typed character. */
  typingSpeed?: number;
  /** Pause between commands. */
  delayBetweenCommands?: number;
  /** Pause after a command finishes typing before output appears. */
  commandPause?: number;
  /** Delay between each revealed output line. */
  lineRevealDelay?: number;
  /** Title shown in the terminal title bar. */
  title?: string;
  /** Prompt symbol. */
  prompt?: string;
  /** Allow the operative to type commands at a live prompt. */
  interactive?: boolean;
  /**
   * Resolves an interactive command to output lines.
   * Return `null` to clear the terminal (like `clear`).
   */
  onCommand?: (cmd: string) => string | string[] | null;
  placeholder?: string;
  className?: string;
  scrollClassName?: string;
};

export function Terminal({
  commands,
  outputs = {},
  typingSpeed = 45,
  delayBetweenCommands = 1000,
  commandPause = 320,
  lineRevealDelay = 200,
  title = "cgs-operative@arena-node:~",
  prompt = "$",
  interactive = false,
  onCommand,
  placeholder = "Type a command…",
  className = "",
  scrollClassName = "",
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const cancelled = useRef(false);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const typeCommand = useCallback(
    async (cmd: string, out: string[]) => {
      setBusy(true);
      for (let i = 0; i <= cmd.length; i++) {
        if (cancelled.current) return;
        setCurrent(cmd.slice(0, i));
        await sleep(typingSpeed);
      }
      if (cancelled.current) return;
      const id = ++idRef.current;
      setLines((prev) => [...prev, { id, command: cmd, output: [] }]);
      setCurrent("");
      await sleep(commandPause);
      for (const o of out) {
        if (cancelled.current) return;
        setLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, output: [...l.output, o] } : l))
        );
        await sleep(lineRevealDelay);
      }
      setBusy(false);
    },
    [typingSpeed, commandPause, lineRevealDelay]
  );

  // Play the initial command sequence on mount.
  useEffect(() => {
    cancelled.current = false;
    const run = async () => {
      for (let i = 0; i < commands.length; i++) {
        if (cancelled.current) return;
        await typeCommand(commands[i], outputs[i] ?? []);
        if (cancelled.current) return;
        await sleep(delayBetweenCommands);
      }
    };
    run();
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the scroll position pinned to the newest output.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, current]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw || busy) return;
    setInput("");
    let result: string | string[] | null;
    try {
      result = onCommand ? onCommand(raw) : [`Command not recognized: '${raw}'`];
    } catch {
      result = [`Command failed: '${raw}'`];
    }
    if (result === null) {
      setLines([]);
      return;
    }
    void typeCommand(raw, Array.isArray(result) ? result : [result]);
  };

  return (
    <div
      className={`bg-void-4/90 rounded-2xl border border-white/10 overflow-hidden shadow-2xl font-mono ${className}`}
    >
      {/* Terminal Title Bar */}
      <div className="bg-void-3/90 px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full bg-danger/80 shrink-0" />
          <span className="w-3 h-3 rounded-full bg-warning/80 shrink-0" />
          <span className="w-3 h-3 rounded-full bg-success/80 shrink-0" />
          <span className="ml-2 font-mono text-xs text-muted font-medium truncate">{title}</span>
        </div>
        <TerminalIcon className="w-4 h-4 text-muted shrink-0" />
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        className={`p-4 space-y-3 min-h-[160px] max-h-[220px] overflow-y-auto text-xs ${scrollClassName}`}
      >
        {lines.map((line) => (
          <div key={line.id} className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold whitespace-nowrap">
              <span>{prompt}</span>
              <span>{line.command}</span>
            </div>
            {line.output.map((o, i) => (
              <div
                key={i}
                className="text-muted-2 pl-4 text-[11px] break-all whitespace-pre-wrap"
              >
                {o}
              </div>
            ))}
          </div>
        ))}

        {current !== "" && (
          <div className="flex items-center gap-2 text-primary font-bold whitespace-nowrap">
            <span>{prompt}</span>
            <span>
              {current}
              <span className="animate-pulse">▋</span>
            </span>
          </div>
        )}

        {interactive && current === "" && (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2">
            <span className="text-success font-bold shrink-0">{prompt}</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={busy}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent px-0 py-0 text-white font-mono text-xs placeholder:text-muted-2 outline-none"
            />
          </form>
        )}
      </div>
    </div>
  );
}
