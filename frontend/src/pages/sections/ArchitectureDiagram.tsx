import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "../../components/Reveal";
import { EASE_OUT, VIEWPORT } from "../../lib/motion";

/** Vertical connector whose line draws downward as it enters view. */
function Connector({ delay }: { delay: number }) {
  const reduced = useReducedMotion();

  return (
    <div className="flex justify-center mb-6" aria-hidden>
      <svg width="10" height="32" className="overflow-visible">
        <motion.line
          x1="5"
          y1="0"
          x2="5"
          y2="26"
          stroke="var(--grey-border)"
          strokeWidth="2"
          initial={reduced ? undefined : { pathLength: 0 }}
          whileInView={reduced ? undefined : { pathLength: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.45, delay, ease: "easeOut" }}
        />
        <motion.polygon
          points="1,26 9,26 5,32"
          fill="var(--grey-border)"
          initial={reduced ? undefined : { opacity: 0 }}
          whileInView={reduced ? undefined : { opacity: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.2, delay: delay + 0.4 }}
        />
      </svg>
    </div>
  );
}

/** Node that fades in at a sequenced delay. */
function Node({
  delay,
  className,
  children,
}: {
  delay: number;
  className: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 14 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.5, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ArchitectureDiagram() {
  const engines = [
    { name: "Contention Engine", detail: "Rolling write-lock counters per account" },
    { name: "Simulation Engine", detail: "simulateTransaction + CU profiling" },
    { name: "Fee Engine", detail: "getRecentPrioritizationFees p50/p75/p90" },
  ];

  const outputs = [
    { name: "Dashboard", detail: "React · Vite · Tailwind", icon: "🖥" },
    { name: "REST API", detail: "Rust · Axum · Tokio", icon: "⚡" },
    { name: "SDK", detail: "TypeScript · npm", icon: "📦" },
  ];

  return (
    <section className="py-32 bg-[var(--grey-card)] w-full">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-[-0.03em]">
            Architecture
          </h2>
          <p className="text-[var(--grey-text)]">Open source. Rust backend. React frontend.</p>
        </Reveal>

        <div className="rounded-2xl border border-[var(--grey-border)] bg-black p-10">
          {/* Data source */}
          <Node delay={0} className="flex justify-center mb-6">
            <div className="px-6 py-3 rounded-lg bg-black border border-[var(--yellow)] text-[var(--yellow)] font-semibold text-sm text-center">
              Helius WebSocket
              <div className="text-[var(--grey-text)] text-xs font-normal mt-0.5">
                8 programs · live account updates
              </div>
            </div>
          </Node>

          <Connector delay={0.3} />

          {/* Three engines */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {engines.map((engine, i) => (
              <Node
                key={engine.name}
                delay={0.6 + i * 0.1}
                className="rounded-lg p-4 text-center bg-black border border-[var(--purple)]"
              >
                <div className="font-semibold text-white text-sm mb-1">{engine.name}</div>
                <div className="text-[var(--grey-text)] text-xs">{engine.detail}</div>
              </Node>
            ))}
          </div>

          <Connector delay={0.95} />

          {/* Recommendation Engine — filled purple */}
          <Node delay={1.25} className="flex justify-center mb-6">
            <div className="px-8 py-4 rounded-lg text-center bg-[var(--purple)] w-72">
              <div className="font-bold text-white mb-1">Recommendation Engine</div>
              <div className="text-white/80 text-xs">
                decide() — pure function, explicit rules, no ML
              </div>
            </div>
          </Node>

          <Connector delay={1.5} />

          {/* Three outputs */}
          <div className="grid grid-cols-3 gap-4">
            {outputs.map((output, i) => (
              <Node
                key={output.name}
                delay={1.8 + i * 0.1}
                className="rounded-lg p-4 text-center bg-black border border-[var(--grey-border)]"
              >
                <div className="text-2xl mb-2">{output.icon}</div>
                <div className="font-semibold text-white text-sm mb-1">{output.name}</div>
                <div className="text-[var(--grey-text)] text-xs">{output.detail}</div>
              </Node>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
