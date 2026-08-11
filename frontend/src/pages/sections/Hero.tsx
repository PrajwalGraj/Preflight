import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, fadeUpChild, staggerContainer } from "../../lib/motion";

const VIEW = 520;
const CENTER = VIEW / 2;
const RING_COUNT = 8;

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

/** Concentric hex field — the recurring brand mark, drawn in hairlines.
 *  Every ring stays visible; the whole field breathes outward as one so the
 *  structure reads clearly instead of flickering ring by ring. */
function HexField() {
  const reduced = useReducedMotion();

  return (
    <motion.svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="w-full h-full overflow-visible"
      aria-hidden
      style={{ originX: "50%", originY: "50%" }}
      animate={reduced ? undefined : { scale: [0.94, 1.06, 0.94] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    >
      {Array.from({ length: RING_COUNT }, (_, i) => {
        const r = 34 + (222 * i) / (RING_COUNT - 1);
        return (
          <motion.polygon
            key={i}
            points={hexPoints(CENTER, CENTER, r)}
            fill="none"
            stroke="var(--purple)"
            strokeWidth="1"
            style={{ originX: "50%", originY: "50%" }}
            animate={
              reduced ? { opacity: 0.4 } : { opacity: [0.5, 0.16, 0.5] }
            }
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.28,
            }}
          />
        );
      })}
    </motion.svg>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  const container = staggerContainer(0.09, 0.1);
  const child = fadeUpChild(14);

  return (
    <section className="relative bg-black pt-16 rule-b overflow-hidden">
        <div className="max-w-7xl mx-auto rule-x grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy */}
          <motion.div
            className="px-8 md:px-14 py-20 md:py-28"
            variants={reduced ? undefined : container}
            initial={reduced ? undefined : "hidden"}
            animate={reduced ? undefined : "show"}
          >
            <motion.div
              variants={reduced ? undefined : child}
              className="flex items-center gap-2.5 text-sm text-[var(--grey-text)] mb-10"
            >
              <motion.span
                className="w-1.5 h-1.5 bg-[var(--status-green)]"
                animate={reduced ? undefined : { opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              Live on Solana mainnet — 8 programs streaming
            </motion.div>

            <h1 className="display text-white text-[2.75rem] md:text-6xl lg:text-7xl mb-8">
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

            <motion.p
              variants={reduced ? undefined : child}
              className="text-[var(--grey-text)] text-lg leading-relaxed max-w-md mb-12"
            >
              The real-time execution intelligence layer for Solana. Contention, fees and
              simulation — resolved into one call before your transaction is signed.
            </motion.p>

            <motion.div
              variants={reduced ? undefined : child}
              className="flex flex-col sm:flex-row items-stretch sm:items-start w-fit"
            >
              <a
                href="#signal"
                className="px-7 py-3.5 font-semibold text-sm bg-[var(--yellow)] text-black hover:brightness-110 transition-all duration-200"
              >
                View live network
              </a>
              <Link
                to="/docs"
                className="px-7 py-3.5 font-semibold text-sm text-center text-white border border-[var(--rule)] border-t-0 sm:border-t sm:border-l-0 hover:bg-white/5 transition-colors duration-200"
              >
                Read the docs
              </Link>
            </motion.div>
          </motion.div>

          {/* Graphic */}
          <motion.div
            className="relative border-t lg:border-t-0 lg:border-l border-[var(--rule)] min-h-[340px] lg:min-h-0 flex items-center justify-center p-10"
            initial={reduced ? undefined : { opacity: 0 }}
            animate={reduced ? undefined : { opacity: 1 }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.2 }}
          >
            <div className="w-full max-w-lg aspect-square">
              <HexField />
            </div>

            {/* Corner ticks */}
            {[
              "top-4 left-4",
              "top-4 right-4",
              "bottom-4 left-4",
              "bottom-4 right-4",
            ].map((pos) => (
              <span key={pos} aria-hidden className={`absolute w-1.5 h-1.5 bg-white/30 ${pos}`} />
            ))}
          </motion.div>
        </div>
    </section>
  );
}
