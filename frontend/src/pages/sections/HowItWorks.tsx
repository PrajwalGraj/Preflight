import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "../../components/Reveal";
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
    <section className="relative grain py-32 max-w-6xl mx-auto px-6 bg-black">
      <Reveal className="text-center mb-16 relative z-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-[-0.03em]">
          How It Works
        </h2>
        <p className="text-[var(--grey-text)] max-w-xl mx-auto">
          Three engines, one decision. No ML, no black boxes — just live data and explicit logic.
        </p>
      </Reveal>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            className="relative"
            initial={reduced ? undefined : { opacity: 0, y: 24 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.6, delay: i * STEP_STAGGER, ease: EASE_OUT }}
          >
            {/* Connector line — draws left-to-right into the gap */}
            {i < STEPS.length - 1 && !reduced && (
              <motion.div
                aria-hidden
                className="hidden lg:block absolute top-24 -right-6 w-6 h-px bg-[var(--yellow)]/40 origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.4, delay: i * STEP_STAGGER + 0.45, ease: "easeOut" }}
              />
            )}

            <motion.div
              whileHover={
                reduced
                  ? undefined
                  : { y: -6, borderColor: "#8f71d3", boxShadow: "0 14px 40px rgba(143,113,211,0.25)" }
              }
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="h-full rounded-2xl p-8 bg-[var(--grey-card)] border border-[var(--grey-border)]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-mono uppercase text-[var(--yellow)]">{step.num}</div>
                <motion.div
                  className="text-[var(--purple)] font-bold text-lg leading-none"
                  whileHover={reduced ? undefined : { x: 4 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                >
                  »
                </motion.div>
              </div>

              {/* Icon box springs in */}
              <motion.div
                className="w-16 h-16 rounded-xl bg-black border border-[var(--grey-border)] flex items-center justify-center text-3xl mb-6"
                initial={reduced ? undefined : { scale: 0.4, opacity: 0 }}
                whileInView={reduced ? undefined : { scale: 1, opacity: 1 }}
                viewport={VIEWPORT}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 18,
                  delay: i * STEP_STAGGER + 0.15,
                }}
              >
                {step.icon}
              </motion.div>

              <div className="font-semibold text-white text-lg mb-3">{step.title}</div>
              <div className="text-[var(--grey-text)] text-sm leading-relaxed">{step.desc}</div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
