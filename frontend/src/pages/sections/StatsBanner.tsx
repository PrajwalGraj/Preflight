import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "../../components/AnimatedCounter";
import { fadeUpChild, staggerContainer, VIEWPORT } from "../../lib/motion";

const STATS = [
  { value: 58, suffix: "%", label: "Bot transaction failure rate" },
  { value: 78, suffix: "%", label: "Failures that are contention-type" },
  { value: 635, suffix: " SOL", label: "Lost to fees — one program, one month" },
];

/** L-bracket accents pinned to opposite corners of a cell. */
function Brackets() {
  return (
    <>
      <span
        aria-hidden
        className="absolute top-0 left-0 w-3.5 h-3.5 border-t border-l border-[var(--purple)]"
      />
      <span
        aria-hidden
        className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b border-r border-[var(--purple)]"
      />
    </>
  );
}

export function StatsBanner() {
  const reduced = useReducedMotion();

  return (
    <section className="bg-black rule-b">
        <motion.div
          className="max-w-7xl mx-auto rule-x grid grid-cols-1 sm:grid-cols-3"
          variants={reduced ? undefined : staggerContainer(0.12)}
          initial={reduced ? undefined : "hidden"}
          whileInView={reduced ? undefined : "show"}
          viewport={VIEWPORT}
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={reduced ? undefined : fadeUpChild(14)}
              className={`relative px-8 md:px-12 py-14 ${
                i > 0 ? "border-t sm:border-t-0 sm:border-l border-[var(--rule)]" : ""
              }`}
            >
              <Brackets />
              <div className="display text-white text-4xl md:text-5xl mb-4">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-[var(--grey-text)] leading-snug max-w-[22ch]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
    </section>
  );
}
