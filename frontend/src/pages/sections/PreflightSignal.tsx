import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import type { StatusResponse } from "../../api/client";
import { fetchStatus } from "../../api/client";
import { StatusDot } from "../../components/StatusDot";
import { PURPLE_CARD_BACKGROUND } from "../../lib/purpleCard";
import { EASE_OUT, VIEWPORT } from "../../lib/motion";

function networkLabel(network: string): {
  text: string;
  dot: string;
  conditions: string;
} {
  switch (network) {
    case "healthy":
      return { text: "Network Ready", dot: "var(--status-green)", conditions: "Excellent" };
    case "moderate":
      return { text: "Moderate Load", dot: "var(--yellow)", conditions: "Fair" };
    case "congested":
      return { text: "High Congestion", dot: "var(--status-red)", conditions: "Poor" };
    default:
      return { text: "Checking...", dot: "var(--grey-text)", conditions: "—" };
  }
}

export function PreflightSignal() {
  const reduced = useReducedMotion();

  // Data fetching untouched — motion only wraps it.
  const { data, error, isLoading } = useSWR<StatusResponse>("status", fetchStatus, {
    refreshInterval: 10_000,
  });

  const label = networkLabel(data?.network ?? "");

  const hotspots = data?.programs.filter((p) => p.level === "High" || p.level === "Moderate") ?? [];

  const freshnessSec = data ? Math.round(data.data_freshness_ms / 1000) : null;

  return (
    <section id="signal" className="relative grain bg-black w-full py-32">
      <div className="relative z-10 max-w-2xl mx-auto px-6">
        {/* Section label */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 10 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="text-[var(--yellow)] text-[11px] font-semibold uppercase tracking-[0.2em] mb-8 text-center"
        >
          Preflight Signal
        </motion.div>

        {/* Main Signal Card — scales up subtly as it enters view */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, scale: 0.95 }}
          whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="rounded-2xl p-8 md:p-10 shadow-[0_0_60px_rgba(143,113,211,0.25)]"
          style={PURPLE_CARD_BACKGROUND}
        >
          {isLoading && (
            <div className="text-white/70 text-center py-8">Connecting to Solana mainnet...</div>
          )}

          {error && (
            <div className="text-white font-semibold text-center py-8">
              Could not reach Preflight API. Make sure the server is running.
            </div>
          )}

          {data && (
            <>
              {/* Top row: status + freshness */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <motion.span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.dot }}
                      animate={reduced ? undefined : { scale: [1, 1.15, 1], opacity: [1, 0.65, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="text-3xl font-bold text-white">{label.text}</div>
                  </div>
                  <div className="text-white/70 text-sm">Real-time Solana network conditions</div>
                </div>
                <div className="text-right">
                  <div className="text-white/70 text-xs">Updated</div>
                  <div className="text-white text-sm font-mono">
                    {freshnessSec !== null ? `${freshnessSec}s ago` : "—"}
                  </div>
                </div>
              </div>

              {/* Stats — plain text, no boxed backgrounds */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                {[
                  { label: "Congestion", value: label.conditions === "—" ? "—" : data.network === "healthy" ? "Low" : data.network === "moderate" ? "Moderate" : "High" },
                  { label: "Landing Conditions", value: label.conditions },
                  { label: "Data Source", value: "Live WebSocket" },
                ].map((box) => (
                  <div key={box.label}>
                    <div className="text-white/60 text-[11px] mb-1 uppercase tracking-wide">
                      {box.label}
                    </div>
                    <div className="text-white font-bold text-lg">{box.value}</div>
                  </div>
                ))}
              </div>

              {/* Hotspots — plain text list, no chip backgrounds */}
              {hotspots.length > 0 ? (
                <div>
                  <div className="text-white/60 text-[11px] uppercase tracking-wide mb-3">
                    Hotspots
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {hotspots.map((p) => (
                      <a
                        key={p.name}
                        href={`/status/${p.name}`}
                        className="flex items-center gap-1.5 text-sm text-white hover:opacity-70 transition-opacity duration-200"
                      >
                        <StatusDot level={p.level} />
                        <span className="capitalize font-medium">{p.name.replace("_", " ")}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-2 mb-2 mt-12 rounded-2xl bg-[var(--yellow)] px-8 py-8 text-center text-base font-medium text-black">
                  No hotspots — all programs showing low contention
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
