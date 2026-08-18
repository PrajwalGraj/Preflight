import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "../lib/motion";

export type BubbleRole = "user" | "assistant";

interface Props {
  role: BubbleRole;
  children: React.ReactNode;
}

/**
 * The single chat bubble treatment, shared by the homepage widget and the
 * /diagnose page. Both surfaces render through this — bubble styling is not
 * duplicated anywhere else.
 *
 * Follows the site's structural system: square corners, hairline rules, and
 * only the existing palette (purple for the user, plain rules for replies).
 */
export function ChatBubble({ role, children }: Props) {
  const reduced = useReducedMotion();
  const isUser = role === "user";

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] ${isUser ? "text-right" : "text-left"}`}>
        <div
          className={`text-[10px] uppercase tracking-[0.16em] mb-2 ${
            isUser ? "text-[var(--purple)]" : "text-[var(--grey-text)]"
          }`}
        >
          {isUser ? "You" : "Preflight"}
        </div>
        <div
          className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-left ${
            isUser
              ? "border border-[var(--purple)] text-white"
              : "border border-[var(--rule)] text-[var(--grey-text)]"
          }`}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}

/** Three-dot rest state shown while a reply is in flight. */
export function ChatTyping() {
  const reduced = useReducedMotion();

  return (
    <div className="flex justify-start">
      <div>
        <div className="text-[10px] uppercase tracking-[0.16em] mb-2 text-[var(--grey-text)]">
          Preflight
        </div>
        <div className="px-4 py-3 border border-[var(--rule)] flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 bg-[var(--grey-text)]"
              animate={reduced ? undefined : { opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
