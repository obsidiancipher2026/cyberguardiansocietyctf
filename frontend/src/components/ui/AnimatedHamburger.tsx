"use client";

import { motion } from "framer-motion";
import React from "react";

const LINE_SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

/**
 * Animated hamburger icon — three lines that morph into an X when `open`
 * flips, using spring transitions. Inherits the current text color
 * (`text-current`), so it adapts to any button context.
 */
export default function AnimatedHamburger({
  open,
  className = "w-5 h-5",
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden className={`relative block ${className}`}>
      {/* Top line → upper arm of the X */}
      <motion.span
        className="absolute left-0 right-0 h-[2px] rounded-full bg-current"
        style={{ top: "20%" }}
        animate={
          open
            ? { y: 5, rotate: 45, x: 1.5 }
            : { y: 0, rotate: 0, x: 0 }
        }
        transition={LINE_SPRING}
      />
      {/* Middle line → fades out while sliding right */}
      <motion.span
        className="absolute left-0 right-0 h-[2px] rounded-full bg-current"
        style={{ top: "50%", y: "-50%" }}
        animate={open ? { opacity: 0, x: 7 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
      />
      {/* Bottom line → lower arm of the X */}
      <motion.span
        className="absolute left-0 right-0 h-[2px] rounded-full bg-current"
        style={{ bottom: "20%" }}
        animate={
          open
            ? { y: -5, rotate: -45, x: 1.5 }
            : { y: 0, rotate: 0, x: 0 }
        }
        transition={LINE_SPRING}
      />
    </span>
  );
}
