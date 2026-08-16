"use client";

import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll container with a cinematic fade effect: soft gradient masks grow
 * from the top / bottom edges while the content can still scroll there, and
 * shrink away as you reach each end. Fades respect `prefers-reduced-motion`.
 */
export function ScrollArea({
  children,
  className,
  fadeClassName,
  fadeSize = "h-8",
}: {
  children: React.ReactNode;
  className?: string;
  /** Extra classes for the fade overlays (positioning, gradient colors). */
  fadeClassName?: string;
  fadeSize?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [topOpacity, setTopOpacity] = useState(0);
  const [bottomOpacity, setBottomOpacity] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const atBottom = scrollHeight - scrollTop - clientHeight <= 1;
      setTopOpacity(scrollTop > 1 ? 1 : 0);
      setBottomOpacity(atBottom ? 0 : 1);
    };

    update();
    viewport.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={viewportRef}
        className="h-full w-full overflow-y-auto overscroll-contain"
      >
        {children}
      </div>

      {/* Top fade */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-void-2 to-transparent transition-opacity duration-300",
          fadeSize,
          fadeClassName
        )}
        style={{ opacity: topOpacity }}
      />

      {/* Bottom fade */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-void-2 to-transparent transition-opacity duration-300",
          fadeSize,
          fadeClassName
        )}
        style={{ opacity: bottomOpacity }}
      />
    </div>
  );
}
