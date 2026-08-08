import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, REVEAL_DURATION, VIEWPORT } from "../lib/motion";

interface Props {
  children: ReactNode;
  /** Seconds to delay the reveal (for manual sequencing). */
  delay?: number;
  /** Distance in px to slide up from. */
  y?: number;
  className?: string;
}

/**
 * Fades + slides its children up as they scroll into view.
 * Renders motion-free (but still visible) when the user has
 * prefers-reduced-motion set.
 */
export function Reveal({ children, delay = 0, y = 12, className }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: REVEAL_DURATION, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
