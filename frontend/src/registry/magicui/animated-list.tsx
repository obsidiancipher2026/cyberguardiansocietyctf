"use client";

import { motion, useInView } from "framer-motion";
import React, { useRef } from "react";

/**
 * AnimatedList — Magic UI style notification feed.
 * Renders a column of items; wrap each row in <AnimatedListItem /> so it
 * slides/blurs into view with a staggered delay as it appears.
 */

export const AnimatedList = React.forwardRef<
  HTMLDivElement,
  { className?: string; children: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div ref={ref} className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      {children}
    </div>
  );
});
AnimatedList.displayName = "AnimatedList";

export function AnimatedListItem({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20px 0px" });

  return (
    <div ref={ref} className={`w-full ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: -24, scale: 0.97, filter: "blur(4px)" }}
        animate={
          inView
            ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, y: -24, scale: 0.97, filter: "blur(4px)" }
        }
        transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
