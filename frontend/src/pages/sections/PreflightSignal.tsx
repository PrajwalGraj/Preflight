import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import type { StatusResponse } from "../../api/client";
import { fetchStatus } from "../../api/client";
import { StatusDot } from "../../components/StatusDot";
import { SectionHeading } from "../../components/SectionHeading";
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

/** One labelled figure in the readout strip. */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 md:px-8 py-7">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--grey-text)] mb-2.5">
        {label}
      </div>
      <div className="display text-white text-xl">{value}</div>
    </div>
  );
}

export function PreflightSignal() {
  const reduced = useReducedMotion();

  // Data fetching untouched — presentation only.
  const { data, error, isLoading } = useSWR<StatusResponse>("status", fetchStatus, {
    refreshInterval: 10_000,
  });

  const label = networkLabel(data?.network ?? "");
  const hotspots = data?.programs.filter((p) => p.level === "High" || p.level === "Moderate") ?? [];
  const freshnessSec = data ? Math.round(data.data_freshness_ms / 1000) : null;

  return (
    <section id="signal" className="relative bg-black rule-b">
        <div className="max-w-7xl mx-auto rule-x">
          <div className="px-8 md:px-14 pt-20 pb-12">
            <SectionHeading
              label="Preflight Signal"
              title="Live network conditions"
              subtitle="Read straight off the Helius WebSocket stream. Updates every 10 seconds."
            />
          </div>

          <motion.div
            className="border-t border-[var(--rule)]"
            initial={reduced ? undefined : { opacity: 0 }}
            whileInView={reduced ? undefined : { opacity: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            {isLoading && (
              <div className="px-8 md:px-14 py-16 text-[var(--grey-text)]">
                Connecting to Solana mainnet…
              </div>
            )}

            {error && (
              <div className="px-8 md:px-14 py-16">
                <div className="flex items-center gap-3 text-white">
                  <span className="w-2 h-2 bg-[var(--status-red)]" />
                  Could not reach the Preflight API — start the server to see live data.
                </div>
              </div>
            )}

            {data && (
              <>
                {/* Headline status */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-8 md:px-14 py-10">
                  <div className="flex items-center gap-4">
                    <motion.span
                      className="w-3 h-3 shrink-0"
                      style={{ backgroundColor: label.dot }}
                      animate={reduced ? undefined : { opacity: [1, 0.25, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="display text-white text-3xl md:text-4xl">{label.text}</div>
                  </div>
                  <div className="text-sm text-[var(--grey-text)]">
                    Updated{" "}
                    <span className="text-white font-mono">
                      {freshnessSec !== null ? `${freshnessSec}s` : "—"}
                    </span>{" "}
                    ago
                  </div>
                </div>

                {/* Readout strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[var(--rule)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--rule)]">
                  <Metric
                    label="Congestion"
                    value={
                      data.network === "healthy"
                        ? "Low"
                        : data.network === "moderate"
                          ? "Moderate"
                          : "High"
                    }
                  />
                  <Metric label="Landing conditions" value={label.conditions} />
                  <Metric label="Data source" value="Live WebSocket" />
                </div>

                {/* Hotspots */}
                <div className="border-t border-[var(--rule)] px-8 md:px-14 py-8">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--grey-text)] mb-4">
                    Hotspots
                  </div>
                  {hotspots.length > 0 ? (
                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                      {hotspots.map((p) => (
                        <a
                          key={p.name}
                          href={`/status/${p.name}`}
                          className="flex items-center gap-2 text-sm text-white hover:text-[var(--yellow)] transition-colors duration-200"
                        >
                          <StatusDot level={p.level} />
                          <span className="capitalize">{p.name.replace("_", " ")}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--grey-text)]">
                      None — all tracked programs are showing low contention.
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
    </section>
  );
}
