import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

interface Props {
  /** Final numeric value to count up to. */
  value: number;
  /** Rendered immediately after the number, e.g. "%". */
  suffix?: string;
  /** Seconds the count-up takes. */
  duration?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` when scrolled into view (once).
 * Jumps straight to the final value under prefers-reduced-motion,
 * so the information is never withheld.
 */
export function AnimatedCounter({ value, suffix = "", duration = 1.5, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (reduced) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
