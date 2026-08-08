import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LevelType } from "../api/client";

/** Contention levels mapped to a numeric axis for plotting. */
export const LEVEL_VALUE: Record<LevelType, number> = {
  Low: 1,
  Moderate: 2,
  High: 3,
};

const COLOR: Record<LevelType, string> = {
  Low: "var(--status-green)",
  Moderate: "var(--yellow)",
  High: "var(--status-red)",
};

const VIEW_W = 100;
const VIEW_H = 40;
const MAX_VALUE = 3;
const TOP_PAD = 3;
const BOTTOM_PAD = 3;
const PLOT_H = VIEW_H - TOP_PAD - BOTTOM_PAD;

/** Y position for a given level value, in viewBox units. */
function yFor(value: number): number {
  return VIEW_H - BOTTOM_PAD - (value / MAX_VALUE) * PLOT_H;
}

interface Props {
  /** Observed samples, oldest first. Values are 1 | 2 | 3. */
  values: number[];
  /** Level of the most recent sample — drives the colour. */
  level: LevelType;
}

/**
 * Stepped area chart of observed contention over the current session.
 *
 * Note: the backend's /v1/program/:name only returns a coarse
 * Low/Moderate/High level (no raw counts, no history), so this plots
 * real polled samples on a 3-level axis rather than a fine-grained
 * time series. No pathLength "draw-in" animation is used here — that
 * technique bakes in a stroke-dasharray sized to the path's length at
 * animation time, which desyncs the instant a new sample changes the
 * path's length, producing a dashed/broken line. The reveal is
 * handled once by the parent card's own fade-in instead.
 */
export function Sparkline({ values, level }: Props) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const color = COLOR[level];

  if (values.length < 2) {
    return (
      <div className="h-[52px] flex items-center text-[var(--grey-text)] text-xs font-mono">
        Collecting samples…
      </div>
    );
  }

  const step = VIEW_W / (values.length - 1);
  const points = values.map((v, i) => ({ x: i * step, y: yFor(v) }));

  // Stepped path — contention holds a level until it changes.
  let line = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    line += ` L ${points[i].x},${points[i - 1].y} L ${points[i].x},${points[i].y}`;
  }
  const area = `${line} L ${VIEW_W},${VIEW_H} L 0,${VIEW_H} Z`;

  const last = points[points.length - 1];
  const gridLevels = [1, 2, 3];

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="w-full h-[52px] overflow-visible"
        role="img"
        aria-label={`Contention trend over ${values.length} samples, currently ${level}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Reference gridlines at each level threshold */}
        {gridLevels.map((lvl) => (
          <line
            key={lvl}
            x1="0"
            x2={VIEW_W}
            y1={yFor(lvl)}
            y2={yFor(lvl)}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.4"
            strokeDasharray="1.5,1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />

        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Real sample points — honest about discrete polls, not a smoothed fake curve */}
        {points.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.1" fill={color} fillOpacity="0.6" />
        ))}

        {/* Latest point — pulsing "live" marker */}
        {!reduced && (
          <motion.circle
            cx={last.x}
            cy={last.y}
            r="2"
            fill={color}
            fillOpacity="0.35"
            animate={{ r: [2, 4.5, 2], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <circle cx={last.x} cy={last.y} r="2" fill={color} />
      </svg>

      <div className="flex justify-between mt-1 text-white/40 text-[10px] font-mono uppercase tracking-wider">
        <span>Oldest</span>
        <span>Now</span>
      </div>
    </div>
  );
}
