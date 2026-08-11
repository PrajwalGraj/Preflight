import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "../../components/SectionHeading";
import { EASE_OUT, VIEWPORT } from "../../lib/motion";

const STEPS = [
  {
    num: "01",
    icon: "⚡",
    title: "WebSocket Stream",
    desc: "Live account updates from 8 Solana programs via Helius",
  },
  {
    num: "02",
    icon: "📊",
    title: "Contention Engine",
    desc: "Counts competing transactions per account in 1s/5s/30s windows",
  },
  {
    num: "03",
    icon: "🔬",
    title: "Simulation Engine",
    desc: "Runs your transaction in practice mode — catches failures before they cost SOL",
  },
  {
    num: "04",
    icon: "💰",
    title: "Fee Analysis",
    desc: "Real-time priority fee percentiles for your specific accounts",
  },
  {
    num: "05",
    icon: "✅",
    title: "Recommendation",
    desc: "SEND, CAUTION, or WAIT — with plain English reasons",
  },
];

const STEP_STAGGER = 0.14;

export function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <section className="relative bg-black rule-b">
        <div className="max-w-7xl mx-auto rule-x">
          <div className="px-8 md:px-14 pt-20 pb-12">
            <SectionHeading
              label="Pipeline"
              title="How it works"
              subtitle="Three engines, one decision. No ML, no black boxes — just live data and explicit logic."
            />
          </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-l border-[var(--rule)]">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            className="relative"
            initial={reduced ? undefined : { opacity: 0, y: 24 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.6, delay: i * STEP_STAGGER, ease: EASE_OUT }}
          >
            <motion.div
              whileHover={reduced ? undefined : { backgroundColor: "rgba(255,255,255,0.03)" }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="h-full p-8 border-r border-b border-[var(--rule)]"
            >
              <div className="display text-[var(--purple)] text-sm mb-8">{step.num}</div>

              <div className="font-semibold text-white text-base mb-3">{step.title}</div>
              <div className="text-[var(--grey-text)] text-sm leading-relaxed">{step.desc}</div>
            </motion.div>
          </motion.div>
        ))}
          </div>
        </div>
    </section>
  );
}
