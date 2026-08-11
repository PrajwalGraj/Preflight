import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import type { ProgramResponse, LevelType, ActionType } from "../../api/client";
import { fetchProgram } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";
import { SectionHeading } from "../../components/SectionHeading";
import { EASE_OUT, fadeUpChild, staggerContainer, VIEWPORT } from "../../lib/motion";
import { PROGRAM_ADDRESSES, LOGO_PATH, shortenAddress } from "../../lib/programs";

const ACTIONS = [
  { name: "jupiter", label: "Jupiter Swap", desc: "SOL → USDC" },
  { name: "pumpfun", label: "Pump.fun Buy", desc: "Token launch" },
  { name: "raydium_amm", label: "Raydium Swap", desc: "AMM pool" },
  { name: "orca", label: "Orca Swap", desc: "Whirlpool" },
  { name: "marinade", label: "Marinade Stake", desc: "SOL staking" },
  { name: "tensor", label: "Tensor Bid", desc: "NFT trading" },
  { name: "magic_eden", label: "Magic Eden Mint", desc: "NFT mint" },
  { name: "raydium_clmm", label: "Raydium CLMM", desc: "Concentrated LP" },
];

const ACCENT_COLOR: Record<ActionType, string> = {
  Send: "var(--status-green)",
  Caution: "var(--yellow)",
  Wait: "var(--status-red)",
};

function levelToAction(level: LevelType): ActionType {
  if (level === "High") return "Wait";
  if (level === "Moderate") return "Caution";
  return "Send";
}

function feeDisplay(level: LevelType): string {
  // Approximate fee ranges by contention level
  // Real fee comes from /v1/program/:name but that endpoint
  // doesn't return fee — use level as proxy for display
  if (level === "High") return "> 50k μL";
  if (level === "Moderate") return "15–50k μL";
  return "5–15k μL";
}

function ActionCard({ name, label, desc }: { name: string; label: string; desc: string }) {
  const reduced = useReducedMotion();

  // Data fetching is untouched — motion only wraps it.
  const { data, isLoading } = useSWR<ProgramResponse>(`program-${name}`, () => fetchProgram(name), {
    refreshInterval: 10_000,
  });

  const action = data ? levelToAction(data.level) : null;
  const accent = action ? ACCENT_COLOR[action] : "var(--grey-border)";

  return (
    <motion.a
      href={`/status/${name}`}
      variants={reduced ? undefined : fadeUpChild(14)}
      whileHover={reduced ? undefined : { backgroundColor: "rgba(255,255,255,0.03)" }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      style={{ borderLeftColor: accent, borderLeftWidth: "2px" }}
      className="relative block overflow-hidden p-6 pb-16 border-t border-r border-b border-[var(--rule)] cursor-pointer"
    >

      {/* Program name + description */}
      <div className="relative mb-4">
        <div className="font-semibold text-white text-sm">{label}</div>
        <div className="text-[var(--grey-text)] text-xs mt-0.5">{desc}</div>
      </div>

      {/* Status badge */}
      <div className="relative mb-3">
        {isLoading || !action ? (
          <div className="h-6 w-20 rounded-full bg-[var(--grey-border)] animate-pulse" />
        ) : (
          <StatusBadge action={action} size="sm" />
        )}
      </div>

      {/* Fee hint */}
      <div className="relative text-[var(--grey-text)] text-xs font-mono">
        {data ? feeDisplay(data.level) : "—"}
      </div>

      {/* Program address — plain text, not a link, keeps the card a single click target */}
      <div className="relative text-[var(--grey-text)] text-[11px] font-mono opacity-60 mt-1">
        {shortenAddress(PROGRAM_ADDRESSES[name])}
      </div>

      {/* Logo — bottom right, hides itself if the file isn't there yet */}
      <img
        src={LOGO_PATH[name]}
        alt=""
        aria-hidden
        className="absolute bottom-3 right-3 w-12 h-12 rounded-lg object-contain opacity-90"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </motion.a>
  );
}

export function PopularActions() {
  const reduced = useReducedMotion();

  return (
    <section id="actions" className="relative bg-black rule-b">
        <div className="max-w-7xl mx-auto rule-x">
          <div className="px-8 md:px-14 pt-20 pb-12">
            <SectionHeading
              label="Top Actions"
              title="Live execution conditions"
              subtitle="The most common Solana actions, measured continuously. Updates every 10 seconds."
            />
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-l border-[var(--rule)]"
            variants={reduced ? undefined : staggerContainer(0.05)}
            initial={reduced ? undefined : "hidden"}
            whileInView={reduced ? undefined : "show"}
            viewport={VIEWPORT}
          >
            {ACTIONS.map((action) => (
              <ActionCard key={action.name} {...action} />
            ))}
          </motion.div>
        </div>
    </section>
  );
}
