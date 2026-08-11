import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "../../components/SectionHeading";
import { EASE_OUT, VIEWPORT } from "../../lib/motion";

const STEPS = [
  { label: "Transaction Built", border: "#8f71d3", bg: "rgba(143,113,211,0.14)", glow: "rgba(143,113,211,0.45)" },
  { label: "Preflight Check", border: "#fad848", bg: "rgba(250,216,72,0.14)", glow: "rgba(250,216,72,0.45)" },
  { label: "Signed & Sent", border: "#22c55e", bg: "rgba(34,197,94,0.14)", glow: "rgba(34,197,94,0.45)" },
] as const;

const IDLE_BORDER = "rgba(255,255,255,0.15)";
const IDLE_BG = "rgba(255,255,255,0.02)";

const GLOW_MS = 900;
const TRAVEL_MS = 600;

// A strict, non-overlapping choreography: a block glows on its own, THEN
// (once that glow ends) the connector light travels to the next block, and
// only once the light arrives does that next block start glowing.
type Phase =
  | { kind: "block"; index: number; duration: number }
  | { kind: "travel"; index: number; duration: number }
  | { kind: "pause"; duration: number };

const SEQUENCE: Phase[] = [
  { kind: "block", index: 0, duration: GLOW_MS },
  { kind: "travel", index: 0, duration: TRAVEL_MS },
  { kind: "block", index: 1, duration: GLOW_MS },
  { kind: "travel", index: 1, duration: TRAVEL_MS },
  { kind: "block", index: 2, duration: GLOW_MS },
  { kind: "pause", duration: TRAVEL_MS },
];

/** Connector line between two blocks — the light only renders (and runs once)
 *  while this connector is the active travel phase, so it never loops on its own. */
function Connector({ traveling, color, runId }: { traveling: boolean; color: string; runId: number }) {
  const reduced = useReducedMotion();

  return (
    <div className="relative hidden lg:block w-16 md:w-20 h-px bg-white/20 self-start mt-12 md:mt-14 shrink-0">
      {!reduced && traveling && (
        <motion.span
          key={runId}
          aria-hidden
          className="absolute -top-[3px] w-2 h-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: TRAVEL_MS / 1000, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export function TransactionFlow() {
  const reduced = useReducedMotion();
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const current = SEQUENCE[phaseIdx];
    const id = setTimeout(() => {
      setPhaseIdx((p) => (p + 1) % SEQUENCE.length);
    }, current.duration);
    return () => clearTimeout(id);
  }, [phaseIdx, reduced]);

  const phase = SEQUENCE[phaseIdx];
  const activeBlock = phase.kind === "block" ? phase.index : -1;
  const travelConnector = phase.kind === "travel" ? phase.index : -1;

  return (
    <section className="relative bg-black py-28 border-t border-b border-white/20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-16">
        <SectionHeading
          className="lg:w-2/5"
          label="The Flow"
          title="Where Preflight fits"
          subtitle="It sits between building your transaction and signing it — checked against live network conditions before your wallet ever prompts you."
        />

        <motion.div
          className="lg:w-3/5 lg:mt-20"
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-6 sm:gap-0">
            {STEPS.map((step, i) => {
              const isActive = reduced ? i === 0 : i === activeBlock;
              return (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className="dot-pattern w-40 h-24 md:w-48 md:h-28"
                      animate={{
                        borderColor: isActive ? step.border : IDLE_BORDER,
                        backgroundColor: isActive ? step.bg : IDLE_BG,
                        boxShadow: isActive ? `0 0 34px ${step.glow}` : "0 0 0px rgba(0,0,0,0)",
                      }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      style={{ borderWidth: 2, borderStyle: "solid" }}
                    />
                    <div className="mt-4 text-sm text-white/60">{step.label}</div>
                  </div>

                  {i < STEPS.length - 1 && (
                    <Connector
                      traveling={travelConnector === i}
                      color={STEPS[i + 1].border}
                      runId={phaseIdx}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
