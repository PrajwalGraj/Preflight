import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

  return (
    <section className="relative bg-black rule-b">
      <div className="max-w-7xl mx-auto rule-x px-8 md:px-14 py-20">
        <SectionHeading
          className="mb-12"
          label="Ask Preflight"
          title="Ask about live conditions"
          subtitle="Questions about a tracked program are answered from Preflight's own measurements. General Solana questions are answered too."
        />

        <div className="border border-[var(--rule)] max-w-3xl">
          {/* Transcript */}
          <div
            ref={scrollRef}
            className="max-h-[380px] overflow-y-auto px-6 py-6 space-y-6"
          >
            {turns.length === 0 && !pending && (
              <div className="text-sm text-[var(--grey-text)]">
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
            <div className="px-6 pb-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={pending}
                  className="text-xs font-mono px-3 py-1.5 border border-[var(--rule)] text-[var(--grey-text)] hover:text-white hover:border-[var(--purple)] transition-colors duration-200 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="flex border-t border-[var(--rule)]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask(input);
              }}
              placeholder="Ask a question…"
              disabled={pending}
              className="flex-1 px-5 py-4 bg-transparent text-white placeholder-[var(--grey-text)] focus:outline-none focus:border-[var(--purple)] font-mono text-sm disabled:opacity-50"
            />
            <motion.button
              onClick={() => ask(input)}
              disabled={pending || !input.trim()}
              whileHover={reduced ? undefined : { filter: "brightness(1.1)" }}
              whileTap={reduced ? undefined : { scale: 0.99 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="px-7 font-semibold text-sm bg-[var(--yellow)] text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pending ? "…" : "Ask"}
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
