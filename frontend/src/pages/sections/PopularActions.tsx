import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import type { ProgramResponse, LevelType, ActionType } from "../../api/client";
import { fetchProgram } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";
import { Reveal } from "../../components/Reveal";
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
      whileHover={
        reduced
          ? undefined
          : { y: -4, boxShadow: "0 12px 40px rgba(143,113,211,0.28)", borderColor: "#8f71d3" }
      }
      transition={{ duration: 0.25, ease: EASE_OUT }}
      style={{ borderLeftColor: accent, borderLeftWidth: "3px" }}
      className="relative block overflow-hidden rounded-xl p-5 pb-16 bg-[var(--grey-card)] border border-[var(--grey-border)] cursor-pointer"
    >
      {/* Soft accent glow tinting the corner — matches current status */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: accent }}
      />

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
    <section id="actions" className="relative grain py-32 max-w-6xl mx-auto px-6 bg-black">
      <Reveal className="mb-10 relative z-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-[-0.03em]">
          Top Actions
        </h2>
        <p className="text-[var(--grey-text)]">
          Live execution conditions for the most common Solana actions. Updates every 10 seconds.
        </p>
      </Reveal>

      <motion.div
        className="relative z-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4"
        variants={reduced ? undefined : staggerContainer(0.05)}
        initial={reduced ? undefined : "hidden"}
        whileInView={reduced ? undefined : "show"}
        viewport={VIEWPORT}
      >
        {ACTIONS.map((action) => (
          <ActionCard key={action.name} {...action} />
        ))}
      </motion.div>
    </section>
  );
}
