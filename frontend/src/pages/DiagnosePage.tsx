import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ChatBubble, ChatTyping } from "../components/ChatBubble";
import type { BubbleRole } from "../components/ChatBubble";
import { SectionHeading } from "../components/SectionHeading";
import { sendChat } from "../api/client";
import { EASE_OUT } from "../lib/motion";

interface Turn {
  role: BubbleRole;
  text: string;
}

const SUGGESTIONS = [
  "Why did my transactions fail?",
  "How much have I wasted on failed fees?",
  "What should I do differently?",
];

export function DiagnosePage() {
  const reduced = useReducedMotion();
  const { publicKey, connected } = useWallet();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const wallet = publicKey?.toBase58();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [turns, pending, reduced]);

  // Clearing on disconnect avoids showing one wallet's diagnosis to the next.
  useEffect(() => {
    if (!connected) setTurns([]);
  }, [connected]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending || !wallet) return;

    setTurns((t) => [...t, { role: "user", text: trimmed }]);
    setInput("");
    setPending(true);

    const reply = await sendChat(trimmed, "wallet", wallet);

    setTurns((t) => [...t, { role: "assistant", text: reply }]);
    setPending(false);
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="pt-16">
        <section className="relative bg-black rule-b">
          <div className="max-w-7xl mx-auto rule-x px-8 md:px-14 py-20">
            <SectionHeading
              className="mb-12"
              label="Diagnose"
              title="Why did my transactions fail?"
              subtitle="Connect a wallet and Preflight will read its recent failures, classify each one, and explain what it would have advised."
            />

            {!connected ? (
              /* Wallet gate */
              <div className="border border-[var(--rule)] max-w-3xl px-8 py-14 text-center">
                <div className="display text-white text-xl mb-3">Connect a wallet to begin</div>
                <p className="text-sm text-[var(--grey-text)] max-w-md mx-auto mb-8">
                  Preflight reads public transaction history only. Connecting never requests a
                  signature and never moves funds.
                </p>
                <div className="flex justify-center">
                  <WalletMultiButton />
                </div>
              </div>
            ) : (
              <div className="border border-[var(--rule)] max-w-3xl">
                {/* Connected wallet strip */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--rule)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 bg-[var(--status-green)] shrink-0" />
                    <span className="font-mono text-xs text-[var(--grey-text)] truncate">
                      {wallet}
                    </span>
                  </div>
                  <WalletMultiButton />
                </div>

                {/* Transcript */}
                <div
                  ref={scrollRef}
                  className="max-h-[420px] overflow-y-auto px-6 py-6 space-y-6"
                >
                  {turns.length === 0 && !pending && (
                    <div className="text-sm text-[var(--grey-text)]">
                      Ask a question and Preflight will scan this wallet's recent transactions
                      for failures.
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
                    placeholder="Ask about this wallet…"
                    disabled={pending}
                    className="flex-1 px-5 py-4 bg-transparent text-white placeholder-[var(--grey-text)] focus:outline-none font-mono text-sm disabled:opacity-50"
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
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
