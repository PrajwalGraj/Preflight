import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "../../components/AnimatedCounter";
import { fadeUpChild, staggerContainer, VIEWPORT } from "../../lib/motion";

const STATS = [
  { value: 58, suffix: "%", label: "bot transaction failure rate" },
  { value: 78, suffix: "%", label: "failures are contention-type" },
  { value: 635, suffix: "", label: "SOL lost in fees, one program, one month" },
];

export function StatsBanner() {
  const reduced = useReducedMotion();
  const container = staggerContainer(0.12);
  const child = fadeUpChild(16);

  return (
    <section className="bg-black px-6 md:px-10 py-6">
      <div className="rounded-[2.5rem] bg-[var(--yellow)] px-8 md:px-16 py-16 md:py-20">
        <motion.div
          className="flex flex-col sm:flex-row sm:justify-between gap-10 sm:gap-6"
          variants={reduced ? undefined : container}
          initial={reduced ? undefined : "hidden"}
          whileInView={reduced ? undefined : "show"}
          viewport={VIEWPORT}
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={reduced ? undefined : child}
              className="text-center flex-1"
            >
              <div className="text-5xl md:text-7xl font-extrabold text-black mono tracking-[-0.03em]">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs md:text-sm text-black/70 mt-3 uppercase tracking-widest leading-snug">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
