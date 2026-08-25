import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { sendChat } from "../api/client";
import { ChatBubble, ChatTyping } from "./ChatBubble";
import type { BubbleRole } from "./ChatBubble";
import { SectionHeading } from "./SectionHeading";
import { EASE_OUT } from "../lib/motion";

interface Turn {
  role: BubbleRole;
  text: string;
}

const SUGGESTIONS = [
  "Is Jupiter safe to trade right now?",
  "How busy is Pump.fun?",
  "What is a blockhash?",
];

/**
 * Homepage assistant. No wallet required — questions about tracked programs
 * are answered from Preflight's own live data by the backend.
 */
export function AskPreflight() {
  const reduced = useReducedMotion();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [turns, pending, reduced]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    setTurns((t) => [...t, { role: "user", text: trimmed }]);
    setInput("");
    setPending(true);

    // sendChat never throws — it resolves to a user-safe message on failure.
    const reply = await sendChat(trimmed, "homepage");

    setTurns((t) => [...t, { role: "assistant", text: reply }]);
    setPending(false);
  }

  const hasInput = input.trim().length > 0;
  const interactive = hasInput && !pending;
  const morphTransition = reduced ? { duration: 0.01 } : { duration: 0.2, ease: EASE_OUT };

  return (
    <section className="relative bg-black rule-b overflow-hidden">
      {/* Ambient gradient glow, centered behind the card */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[380px] w-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(143,113,211,0.28),rgba(250,216,72,0.06)_55%,transparent_75%)] blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto rule-x px-8 md:px-14 py-20">
        <SectionHeading
          className="mb-12"
          center
          label="Ask Preflight"
          title={
            <>
              Ask <span className="text-[var(--yellow)]">{"{ai}"}</span> about live conditions
            </>
          }
          subtitle="Questions about a tracked program are answered from Preflight's own measurements. General Solana questions are answered too."
        />

        <div className="relative mx-auto max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-[0_0_90px_-25px_rgba(143,113,211,0.5)] overflow-hidden">
          {/* Hairline sheen along the top edge */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="max-h-[380px] overflow-y-auto px-6 md:px-8 pt-8 pb-6 space-y-6"
          >
            {turns.length === 0 && !pending && (
              <div className="text-sm text-center text-[var(--grey-text)] max-w-md mx-auto">
                Ask about Jupiter, Pump.fun, Raydium, Orca, Marinade, Tensor or Magic Eden —
                or anything else about Solana.
              </div>
            )}

            {turns.map((turn, i) => (
              <ChatBubble key={i} role={turn.role}>
                {turn.text}
              </ChatBubble>
            ))}

            {pending && <ChatTyping />}
          </div>

          {/* Suggestions */}
          {turns.length === 0 && (
            <div className="px-6 md:px-8 pb-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={pending}
                  className="text-xs font-mono px-4 py-2 rounded-full border border-white/10 bg-white/5 text-[var(--grey-text)] hover:text-white hover:border-[var(--purple)] hover:bg-white/10 transition-colors duration-150 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 pl-6 pr-2.5 py-2.5 focus-within:border-[var(--purple)] focus-within:bg-black/70 transition-colors duration-200">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ask(input);
                }}
                placeholder="Ask a question…"
                disabled={pending}
                aria-label="Ask a question"
                className="composer-input flex-1 min-w-0 rounded-full bg-transparent text-white placeholder-[var(--grey-text)] font-mono text-sm py-1.5 disabled:opacity-50"
              />
              <motion.button
                layout
                onClick={() => ask(input)}
                disabled={!interactive}
                aria-label="Ask"
                aria-busy={pending}
                whileHover={reduced || !interactive ? undefined : { filter: "brightness(1.1)" }}
                whileTap={reduced || !interactive ? undefined : { scale: 0.94 }}
                transition={{ layout: morphTransition }}
                className={`shrink-0 flex items-center justify-center h-10 rounded-full font-semibold text-xs transition-colors duration-150 disabled:cursor-not-allowed ${
                  hasInput || pending
                    ? "w-10 bg-gradient-to-br from-[#fff1a8] via-[var(--yellow)] to-[#e0b62f] text-black shadow-[0_0_18px_-2px_rgba(250,216,72,0.55)]"
                    : "px-5 bg-[var(--yellow)]/15 text-[var(--yellow)]"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {pending ? (
                    <motion.svg
                      key="pending"
                      initial={reduced ? undefined : { opacity: 0 }}
                      animate={reduced ? undefined : { opacity: 1, rotate: 360 }}
                      exit={reduced ? undefined : { opacity: 0 }}
                      transition={
                        reduced
                          ? undefined
                          : {
                              opacity: { duration: 0.15 },
                              rotate: { duration: 0.8, repeat: Infinity, ease: "linear" },
                            }
                      }
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </motion.svg>
                  ) : hasInput ? (
                    <motion.svg
                      key="arrow"
                      initial={reduced ? undefined : { opacity: 0, y: 4, scale: 0.8 }}
                      animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
                      exit={reduced ? undefined : { opacity: 0, y: -4, scale: 0.8 }}
                      transition={morphTransition}
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 19V5M5 12l7-7 7 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  ) : (
                    <motion.span
                      key="label"
                      initial={reduced ? undefined : { opacity: 0 }}
                      animate={reduced ? undefined : { opacity: 1 }}
                      exit={reduced ? undefined : { opacity: 0 }}
                      transition={morphTransition}
                    >
                      Ask
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
