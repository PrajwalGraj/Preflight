import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ProgramResponse, LevelType, ActionType } from "../../api/client";
import { fetchProgram } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusDot } from "../../components/StatusDot";
import { Reveal } from "../../components/Reveal";
import { EASE_OUT, POP_SPRING } from "../../lib/motion";

function levelToAction(level: LevelType): ActionType {
  if (level === "High") return "Wait";
  if (level === "Moderate") return "Caution";
  return "Send";
}

export function CheckProgram() {
  const reduced = useReducedMotion();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProgramResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchProgram(trimmed);
      setResult(data);
    } catch {
      setError(
        "Program not found or not tracked. Only the 8 monitored programs are supported in v1."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCheck();
  }

  return (
    <section className="bg-black rule-b">
        <div className="max-w-7xl mx-auto rule-x">
      <Reveal>
        <div className="px-8 md:px-14 py-16">
          <div className="eyebrow mb-5">
            <span className="opacity-50">//</span> Lookup <span className="opacity-50">//</span>
          </div>
          <h2 className="display text-white text-2xl md:text-3xl mb-4">Check a program</h2>
          <p className="text-[var(--grey-text)] text-sm mb-8 max-w-2xl">
            Enter any of the 8 monitored program names to get its live contention status.
            <span className="block mt-2 font-mono text-xs text-[var(--grey-text)] opacity-70">
              jupiter · pumpfun · raydium_amm · raydium_clmm · orca · marinade · tensor · magic_eden
            </span>
          </p>

          {/* Input row */}
          <div className="flex max-w-2xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. jupiter or pumpfun"
              className="flex-1 px-4 py-3.5 bg-transparent border border-[var(--rule)] text-white placeholder-[var(--grey-text)] focus:outline-none focus:border-[var(--purple)] transition-colors duration-200 font-mono text-sm"
            />
            <motion.button
              onClick={handleCheck}
              disabled={loading || !input.trim()}
              whileHover={reduced ? undefined : { filter: "brightness(1.1)" }}
              whileTap={reduced ? undefined : { scale: 0.99 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="px-7 py-3.5 font-semibold text-sm bg-[var(--yellow)] text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Checking…" : "Check"}
            </motion.button>
          </div>

          {/* Result — springs in when data returns */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={reduced ? undefined : { opacity: 0, scale: 0.95, y: 8 }}
                animate={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                transition={POP_SPRING}
                className="mt-8 p-6 max-w-2xl border border-[var(--rule)] border-l-2 border-l-[var(--purple)]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="font-mono text-sm text-white font-semibold">{result.program}</div>
                  <StatusBadge action={levelToAction(result.level)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[var(--grey-text)] text-xs uppercase tracking-wide mb-1">
                      Contention
                    </div>
                    <div className="flex items-center text-white text-sm">
                      <StatusDot level={result.level} />
                      {result.level}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--grey-text)] text-xs uppercase tracking-wide mb-1">
                      Data Age
                    </div>
                    <div className="text-white text-sm font-mono">{result.data_freshness_ms}ms</div>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={reduced ? undefined : { opacity: 0, scale: 0.95, y: 8 }}
                animate={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                transition={POP_SPRING}
                className="mt-8 p-5 max-w-2xl border border-[var(--rule)] border-l-2 border-l-[var(--status-red)] text-[var(--status-red)] text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Reveal>
        </div>
    </section>
  );
}
