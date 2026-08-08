import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { PURPLE_CARD_BACKGROUND } from "../../lib/purpleCard";
import { EASE_OUT, fadeUpChild, staggerContainer } from "../../lib/motion";

/** Decorative floating dots positioned around the card edges. */
const FLOAT_DOTS = [
  { top: "14%", left: "9%", size: 8, delay: 0, color: "var(--yellow)" },
  { top: "26%", right: "12%", size: 5, delay: 0.8, color: "#ffffff" },
  { bottom: "22%", left: "16%", size: 5, delay: 1.6, color: "#ffffff" },
  { bottom: "16%", right: "10%", size: 8, delay: 2.4, color: "var(--yellow)" },
  { top: "48%", left: "5%", size: 4, delay: 1.2, color: "#ffffff" },
];

export function Hero() {
  const reduced = useReducedMotion();

  const container = staggerContainer(0.1, 0.15);
  const child = fadeUpChild(16);

  return (
    <section className="min-h-screen flex flex-col bg-black pt-24 pb-6 px-6 md:px-10">
      <div
        className="relative flex-1 rounded-[2.5rem] overflow-hidden flex items-center justify-center"
        style={PURPLE_CARD_BACKGROUND}
      >
        {/* Soft drifting glow orbs — extremely subtle depth, never distracting */}
        {!reduced && (
          <>
            <motion.div
              aria-hidden
              className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-white/20 blur-3xl pointer-events-none"
              animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -bottom-32 -right-20 w-[32rem] h-[32rem] rounded-full bg-[var(--yellow)]/10 blur-3xl pointer-events-none"
              animate={{ x: [0, -50, 0], y: [0, -25, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Floating decorative dots */}
        {!reduced &&
          FLOAT_DOTS.map((dot, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute rounded-full pointer-events-none"
              style={{
                top: dot.top,
                left: dot.left,
                right: dot.right,
                bottom: dot.bottom,
                width: dot.size,
                height: dot.size,
                backgroundColor: dot.color,
                opacity: 0.5,
              }}
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: dot.delay,
              }}
            />
          ))}

        <motion.div
          className="relative z-10 text-center max-w-4xl mx-auto px-6"
          variants={reduced ? undefined : container}
          initial={reduced ? undefined : "hidden"}
          animate={reduced ? undefined : "show"}
        >
          {/* Tag line */}
          <motion.div
            variants={reduced ? undefined : child}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 border border-white/10 text-white/90 text-sm mb-8"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-[var(--status-green)]"
              animate={reduced ? undefined : { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            Live on Solana Mainnet
          </motion.div>

          {/* Main headline — each line staggers in */}
          <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-extrabold tracking-[-0.04em] text-white mb-6 leading-[0.95]">
            <motion.span variants={reduced ? undefined : child} className="block">
              Know before
            </motion.span>
            <motion.span
              variants={reduced ? undefined : child}
              className="block text-[var(--yellow)]"
            >
              you send.
            </motion.span>
          </h1>

          {/* Sub headline */}
          <motion.p
            variants={reduced ? undefined : child}
            className="text-xl text-white/70 mb-12 max-w-[560px] mx-auto leading-relaxed"
          >
            The real-time execution intelligence layer for Solana.
          </motion.p>

          {/* CTA buttons — fade in last */}
          <motion.div
            variants={reduced ? undefined : child}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.a
              href="#signal"
              whileHover={reduced ? undefined : { scale: 1.02, filter: "brightness(1.1)" }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="px-8 py-4 rounded-none font-bold text-lg bg-[var(--yellow)] text-black"
            >
              View Live Network →
            </motion.a>
            <motion.div
              whileHover={reduced ? undefined : { scale: 1.02 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              <Link
                to="/docs"
                className="block px-8 py-4 rounded-none font-bold text-lg bg-transparent text-white border border-white/30 hover:border-white transition-colors duration-200"
              >
                Read the Docs
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
