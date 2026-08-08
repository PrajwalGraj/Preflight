import { motion, useReducedMotion } from "framer-motion";
import type { LevelType } from "../api/client";

const SEGMENTS = 10;

/** How many of the 10 segments light up per level. */
const FILLED: Record<LevelType, number> = {
  Low: 3,
  Moderate: 6,
  High: 10,
};

const COLOR: Record<LevelType, string> = {
  Low: "var(--status-green)",
  Moderate: "var(--yellow)",
  High: "var(--status-red)",
};

/** Segmented bar visualising the current contention level. */
export function ContentionMeter({ level }: { level: LevelType }) {
  const reduced = useReducedMotion();
  const filled = FILLED[level];

  return (
    <div className="flex gap-1" role="img" aria-label={`Contention level: ${level}`}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <motion.div
          key={i}
          className="h-8 flex-1 rounded-[2px]"
          initial={reduced ? undefined : { opacity: 0, scaleY: 0.4 }}
          animate={{
            opacity: 1,
            scaleY: 1,
            backgroundColor: i < filled ? COLOR[level] : "rgba(255,255,255,0.12)",
          }}
          transition={{
            duration: 0.3,
            delay: reduced ? 0 : i * 0.03,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
