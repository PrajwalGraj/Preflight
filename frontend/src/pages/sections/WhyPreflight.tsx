import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "../../components/AnimatedCounter";
import { EASE_OUT, VIEWPORT } from "../../lib/motion";

const STATS = [
  {
    value: 58,
    suffix: "%",
    label: "bot transaction failure rate on Solana",
    source: "ISSTA 2025 — 1.5B transactions studied",
  },
  {
    value: 78,
    suffix: "%",
    label: "of failures are contention-type errors",
    source: "Preflight backtest — 600 mainnet transactions",
  },
  {
    value: 635,
    suffix: "",
    label: "SOL lost in fees on one program in one month",
    source: "Chainlink Data Store Program analysis",
  },
];

export function WhyPreflight() {
  const reduced = useReducedMotion();

  return (
    <section className="bg-[var(--yellow)] w-full">
      <div className="max-w-6xl mx-auto px-6 py-32">
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 12 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="eyebrow mb-10"
          style={{ color: "rgba(0,0,0,0.6)" }}
        >
          <span className="opacity-50">//</span> Why Preflight exists{" "}
          <span className="opacity-50">//</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 16 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <h2 className="display text-4xl md:text-5xl text-black mb-2">Users send blind.</h2>
            <h2 className="display text-4xl md:text-5xl text-black/60 mb-8">
              Preflight fixes that.
            </h2>
            <div className="space-y-4 text-black/80 leading-relaxed">
              <p>
                Solana has no public mempool. When you send a transaction, you cannot see what
                else is competing for the same accounts at the same moment.
              </p>
              <p>
                Existing fee tools estimate from historical data. They cannot predict
                probabilistic failure from real-time account contention.
              </p>
              <p>
                Preflight checks live write-lock contention on the specific accounts your
                transaction touches — right now — and tells you what to do before you pay.
              </p>
            </div>
          </motion.div>

          {/* Right: stat cards — huge editorial numbers, staggered offsets */}
          <div className="space-y-5">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={reduced ? undefined : { opacity: 0, x: 24 }}
                whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.6, delay: i * 0.12, ease: EASE_OUT }}
                whileHover={reduced ? undefined : { y: -4 }}
                className={`p-8 bg-black ${i === 1 ? "lg:ml-10" : ""}`}
              >
                <div className="display text-[5rem] md:text-[5.5rem] leading-[0.85] text-[var(--yellow)] mb-4">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-white font-medium mb-1">{stat.label}</div>
                <div className="text-[var(--grey-text)] text-xs">{stat.source}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
