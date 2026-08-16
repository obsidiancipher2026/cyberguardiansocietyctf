"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayPath, setDisplayPath] = useState(pathname);
  const displayChildrenRef = useRef(children);

  useEffect(() => {
    setDisplayPath(pathname);
  }, [pathname]);

  const isNew = pathname === displayPath;
  if (isNew) {
    displayChildrenRef.current = children;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={displayPath}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      >
        {isNew ? children : displayChildrenRef.current}
      </motion.div>
    </AnimatePresence>
  );
}
