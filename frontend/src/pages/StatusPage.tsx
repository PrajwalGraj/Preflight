import { useEffect, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import type { ProgramResponse, LevelType, ActionType } from "../api/client";
import { fetchProgram, fetchStatus } from "../api/client";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ScrollProgress } from "../components/ScrollProgress";
import { StatusBadge } from "../components/StatusBadge";
import { StatusDot } from "../components/StatusDot";
import { Reveal } from "../components/Reveal";
import { ContentionMeter } from "../components/ContentionMeter";
import { Sparkline, LEVEL_VALUE } from "../components/Sparkline";
import { EASE_OUT, fadeUpChild, staggerContainer, VIEWPORT } from "../lib/motion";
import { PROGRAM_ADDRESSES, LOGO_PATH, shortenAddress, explorerUrl } from "../lib/programs";

const PROGRAM_LABELS: Record<string, string> = {
  jupiter: "Jupiter Aggregator",
  pumpfun: "Pump.fun",
  raydium_amm: "Raydium AMM",
  raydium_clmm: "Raydium CLMM",
  orca: "Orca Whirlpool",
  marinade: "Marinade Stake",
  tensor: "Tensor",
  magic_eden: "Magic Eden",
};

const ALL_PROGRAMS = Object.keys(PROGRAM_LABELS);

const LEVEL_COLOR: Record<LevelType, string> = {
  Low: "var(--status-green)",
  Moderate: "var(--yellow)",
  High: "var(--status-red)",
};

/** ~5 minutes of history at the 5s poll interval. */
const MAX_SAMPLES = 60;

function levelToAction(level: LevelType): ActionType {
  if (level === "High") return "Wait";
  if (level === "Moderate") return "Caution";
  return "Send";
}

function StatusExplanation({ level, program }: { level: LevelType; program: string }) {
  const label = PROGRAM_LABELS[program] ?? program;

  const content = {
    Low: {
      icon: "✅",
      title: "Good time to transact",
      body: `${label} is showing low account contention. Transactions have a strong chance of landing at base priority fee right now.`,
    },
    Moderate: {
      icon: "⚠️",
      title: "Proceed with caution",
      body: `${label} is showing moderate contention. Consider increasing your priority fee to improve landing probability. Avoid sending with zero priority fee right now.`,
    },
    High: {
      icon: "🛑",
      title: "Wait before sending",
      body: `${label} is experiencing high contention. Many transactions are competing for the same accounts. Wait 2–5 minutes or use a significantly higher priority fee.`,
    },
  }[level];

  return (
    <div
      className="border border-[var(--rule)] px-6 md:px-8 py-6 flex gap-4"
      style={{ borderLeft: `2px solid ${LEVEL_COLOR[level]}` }}
    >
      <div className="text-2xl leading-none">{content.icon}</div>
      <div>
        <div className="font-semibold text-white mb-2">{content.title}</div>
        <div className="text-[var(--grey-text)] text-sm leading-relaxed">{content.body}</div>
      </div>
    </div>
  );
}

export function StatusPage() {
  const { program } = useParams<{ program: string }>();
  const reduced = useReducedMotion();

  const isValidProgram = Boolean(program && PROGRAM_LABELS[program]);

  // Every hook below runs unconditionally. The unknown-program redirect
  // lives *after* them on purpose: bailing out early would run fewer
  // hooks on an invalid param than on a valid one, and since both share
  // the /status/:program route (same component instance), navigating
  // jupiter -> banana would crash with "rendered fewer hooks than
  // expected". A null SWR key skips the fetch instead.
  const { data, isLoading, error } = useSWR<ProgramResponse>(
    isValidProgram ? `status-page-${program}` : null,
    () => fetchProgram(program as string),
    { refreshInterval: 5_000 }
  );

  const { data: allStatus } = useSWR(
    isValidProgram ? "status-page-all" : null,
    fetchStatus,
    { refreshInterval: 10_000 }
  );

  // Build a real contention trend by accumulating the 5s polls.
  // The API exposes no history endpoint, so this covers the current
  // session only — reset whenever the viewed program changes.
  const [history, setHistory] = useState<number[]>([]);
  const lastSampleRef = useRef<number>(0);

  useEffect(() => {
    setHistory([]);
    lastSampleRef.current = 0;
  }, [program]);

  useEffect(() => {
    if (!data) return;
    // SWR hands back a new object each poll; de-dupe on freshness stamp
    // so a re-render never double-counts a single observation.
    if (data.data_freshness_ms === lastSampleRef.current) return;
    lastSampleRef.current = data.data_freshness_ms;

    setHistory((prev) => [...prev, LEVEL_VALUE[data.level]].slice(-MAX_SAMPLES));
  }, [data]);

  if (!isValidProgram) {
    return <Navigate to="/404" replace />;
  }

  const label = PROGRAM_LABELS[program as string];
  const address = PROGRAM_ADDRESSES[program as string];
  const action = data ? levelToAction(data.level) : null;

  return (
    <div className="min-h-screen bg-[var(--black)]">
      <ScrollProgress />
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[var(--grey-text)] text-sm hover:text-white transition-colors mb-10"
        >
          ← Back to homepage
        </Link>

        {/* Header */}
        <Reveal className="mb-10">
          <div className="flex items-center gap-2 text-[var(--grey-text)] text-xs uppercase tracking-widest mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-green)] animate-pulse" />
            Program Status
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <img
              src={LOGO_PATH[program as string]}
              alt=""
              aria-hidden
              className="w-14 h-14 rounded-xl object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <h1 className="text-5xl font-extrabold tracking-[-0.02em] text-white">{label}</h1>
            {action && <StatusBadge action={action} size="lg" />}
          </div>
          <a
            href={explorerUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-mono text-[var(--grey-text)] hover:text-[var(--yellow)] transition-colors"
          >
            {shortenAddress(address)}
            <span aria-hidden>↗</span>
          </a>
        </Reveal>

        {/* Loading state */}
        {isLoading && (
          <div className="border border-[var(--rule)] px-8 py-16 text-center text-[var(--grey-text)]">
            Loading live data...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="border border-[var(--rule)] border-l-2 border-l-[var(--status-red)] px-8 py-16 text-center text-[var(--status-red)]">
            Could not load data. Make sure the Preflight API is running.
          </div>
        )}

        {/* Live status card */}
        {data && (
          <div className="space-y-6">
            {/* Main status card — same hairline-rule treatment as the rest of the site */}
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 12 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className="border border-[var(--rule)]"
              style={{ borderLeft: `2px solid ${LEVEL_COLOR[data.level]}` }}
            >
              {/* Current contention — meter */}
              <div className="px-6 md:px-8 py-6 border-b border-[var(--rule)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--grey-text)]">
                    Current Contention
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot level={data.level} />
                    <span className="text-white text-lg font-semibold">{data.level}</span>
                  </div>
                </div>
                <ContentionMeter level={data.level} />
              </div>

              {/* Contention trend — real accumulated samples */}
              <div className="px-6 md:px-8 py-6 border-b border-[var(--rule)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--grey-text)]">
                    Contention Trend
                  </div>
                  <div className="text-[var(--grey-text)] text-[11px] font-mono">
                    {history.length} sample{history.length === 1 ? "" : "s"} · this session
                  </div>
                </div>
                <Sparkline values={history} level={data.level} />
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-2 divide-x divide-[var(--rule)] border-b border-[var(--rule)]">
                <div className="px-6 md:px-8 py-6">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--grey-text)] mb-2.5">
                    Data Age
                  </div>
                  <div className="display text-white text-2xl">{data.data_freshness_ms}ms</div>
                </div>
                <div className="px-6 md:px-8 py-6">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--grey-text)] mb-2.5">
                    Recommendation
                  </div>
                  {action && <StatusBadge action={action} size="lg" />}
                </div>
              </div>

              <div className="px-6 md:px-8 py-4 text-[var(--grey-text)] text-xs font-mono">
                Auto-refreshes every 5 seconds · Powered by Helius WebSocket · Program:{" "}
                {program}
              </div>
            </motion.div>

            {/* Explanation */}
            <StatusExplanation level={data.level} program={program as string} />
          </div>
        )}

        {/* All programs navigation */}
        <div className="mt-16">
          <div className="text-[var(--grey-text)] text-xs uppercase tracking-widest mb-6">
            All Programs
          </div>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            variants={reduced ? undefined : staggerContainer(0.05)}
            initial={reduced ? undefined : "hidden"}
            whileInView={reduced ? undefined : "show"}
            viewport={VIEWPORT}
          >
            {ALL_PROGRAMS.map((p) => {
              const programStatus = allStatus?.programs.find((s) => s.name === p);
              const pAction = programStatus ? levelToAction(programStatus.level) : null;
              const isActive = p === program;

              return (
                <motion.div
                  key={p}
                  variants={reduced ? undefined : fadeUpChild(10)}
                  whileHover={reduced ? undefined : { y: -3 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className={`relative flex flex-col gap-2 rounded-lg px-4 py-3 text-sm border transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--purple)] border-[var(--purple)] text-white"
                      : "bg-[var(--grey-card)] border-[var(--grey-border)] text-[var(--grey-text)] hover:border-[var(--purple)] hover:text-white hover:shadow-[0_0_20px_rgba(143,113,211,0.15)]"
                  }`}
                >
                  {/* Stretched link — the whole card navigates to the status page */}
                  <Link
                    to={`/status/${p}`}
                    aria-label={`View ${PROGRAM_LABELS[p]} status`}
                    className="absolute inset-0"
                  />

                  <div className="relative flex items-center justify-between pointer-events-none">
                    <span className="font-medium capitalize">{p.replace("_", " ")}</span>
                    {pAction && <StatusDot level={programStatus?.level ?? "Low"} />}
                  </div>

                  {/* Plain text, not a link — keeping the card a single click target */}
                  <span className="relative w-fit font-mono text-xs opacity-70 pointer-events-none">
                    {shortenAddress(PROGRAM_ADDRESSES[p])}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
