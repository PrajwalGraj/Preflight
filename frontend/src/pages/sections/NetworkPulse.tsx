import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "../../components/AnimatedCounter";
import { SectionHeading } from "../../components/SectionHeading";
import { fadeUpChild, staggerContainer, VIEWPORT } from "../../lib/motion";

// Real, verifiable numbers — pulled from the backend and the project's own
// backtest (scripts/backtest.ts), not estimates. See README.md.
const STATS: {
  value: number;
  suffix?: string;
  display?: string;
  label: string;
  hint: string;
}[] = [
  {
    value: 8,
    label: "Programs tracked live",
    hint: "Jupiter, Raydium, Orca, Pump.fun & more",
  },
  {
    value: 0,
    display: "1s / 5s / 30s",
    label: "Contention windows",
    hint: "Rolling write-lock counters, updated per block",
  },
  {
    value: 10,
    suffix: "s",
    label: "Live refresh interval",
    hint: "Straight off the Helius WebSocket stream",
  },
  {
    value: 0,
    label: "Missed failures in backtest",
    hint: "600 real mainnet transactions replayed",
  },
];

// Evenly spaced, full-bleed vertical rulings behind the section.
const GRID_LINES_X = Array.from({ length: 17 }, (_, i) => ((i + 1) * 100) / 18);
const TICK_DOTS = [
  { top: "10%", left: "5%" },
  { top: "10%", right: "5%" },
  { bottom: "10%", left: "5%" },
  { bottom: "10%", right: "5%" },
];

function StatCard({
  value,
  suffix,
  display,
  label,
  hint,
}: {
  value: number;
  suffix?: string;
  display?: string;
  label: string;
  hint: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={reduced ? undefined : fadeUpChild(14)}
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent px-6 py-9 text-center overflow-hidden hover:border-[var(--purple)]/50 transition-colors duration-200"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <div className="display text-white text-3xl md:text-4xl mb-3 group-hover:text-[var(--yellow)] transition-colors duration-200">
        {display ?? <AnimatedCounter value={value} suffix={suffix} />}
      </div>
      <div className="text-xs uppercase tracking-[0.14em] text-[var(--grey-text)] mb-2">
        {label}
      </div>
      <div className="text-[11px] text-[var(--grey-text)] opacity-70 leading-snug max-w-[22ch] mx-auto">
        {hint}
      </div>
    </motion.div>
  );
}

export function NetworkPulse() {
  const reduced = useReducedMotion();

  return (
    <section className="relative bg-black py-24 overflow-hidden rule-t rule-b">
      {/* Ambient gradient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[380px] w-[820px] rounded-full bg-[radial-gradient(closest-side,rgba(143,113,211,0.24),rgba(250,216,72,0.06)_55%,transparent_75%)] blur-3xl" />
      </div>

      {/* Vertical grid lines */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {GRID_LINES_X.map((pos) => (
          <div
            key={pos}
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: `${pos}%` }}
          />
        ))}
      </div>

      {/* Corner tick dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {TICK_DOTS.map((pos, i) => (
          <span key={i} className="absolute w-1.5 h-1.5 bg-white/50" style={pos} />
        ))}
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <SectionHeading
          className="mb-14"
          center
          label="Live Network"
          title="The pulse behind every call"
          subtitle="Live counts from the engines that power every recommendation — measured continuously, not modeled."
        />

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={reduced ? undefined : staggerContainer(0.08)}
          initial={reduced ? undefined : "hidden"}
          whileInView={reduced ? undefined : "show"}
          viewport={VIEWPORT}
        >
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
