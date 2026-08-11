import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "../../components/Reveal";
import { EASE_OUT, VIEWPORT } from "../../lib/motion";

// Placeholder stats — swap for real numbers later.
const STATS = {
  topLeft: { label: "Transactions Analyzed", value: "10M+" },
  bottomLeft: { label: "Contention Accuracy", value: "94%" },
  topRight: { label: "Checks Per Month", value: "~2 Million" },
  bottomRight: { label: "Trusted By", value: "500 devs" },
};

const HEX_COUNT = 7;
const HEX_MAX_R = 245;
const HEX_MIN_R = 78;
const VIEW_W = 600;
const VIEW_H = 470;
const CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 };

/** Points for a flat-top/pointed-side regular hexagon. */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function StatCallout({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align: "left" | "right";
}) {
  return (
    <div className="relative inline-block">
      {/* Tick square on the outer edge */}
      <span
        aria-hidden
        className={`absolute top-0 w-2.5 h-2.5 bg-[var(--purple)] ${
          align === "left" ? "-left-2.5" : "-right-2.5"
        }`}
      />
      <div className="bg-[var(--purple)] text-white text-xs px-3 py-1.5 whitespace-nowrap">
        {label}
      </div>
      <div className="bg-white text-black text-2xl md:text-3xl font-extrabold px-4 py-3 whitespace-nowrap">
        {value}
      </div>
    </div>
  );
}

// Evenly spaced, full-bleed vertical rulings behind the section.
const GRID_LINES_X = Array.from({ length: 17 }, (_, i) => ((i + 1) * 100) / 18);
const TICK_DOTS = [
  { top: "18%", left: "5%" },
  { top: "18%", right: "5%" },
  { bottom: "18%", left: "5%" },
  { bottom: "18%", right: "5%" },
];

export function NetworkPulse() {
  const reduced = useReducedMotion();

  return (
    <section className="relative bg-black py-24 overflow-hidden rule-t rule-b">
      {/* Vertical grid lines */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {GRID_LINES_X.map((pos) => (
          <div
            key={pos}
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: `${pos}%` }}
          />
        ))}
      </div>

      {/* Corner tick dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {TICK_DOTS.map((pos, i) => (
          <span
            key={i}
            className="absolute w-1.5 h-1.5 bg-white/50"
            style={pos}
          />
        ))}
      </div>

      <Reveal className="relative text-center mb-4">
        <span className="eyebrow">
          <span className="opacity-50">//</span> Live Network{" "}
          <span className="opacity-50">//</span>
        </span>
      </Reveal>

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="relative flex items-center justify-center min-h-[420px]">
          {/* Concentric hexagon rings */}
          <motion.svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full max-w-2xl"
            initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
            whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          >
            {Array.from({ length: HEX_COUNT }, (_, i) => {
              const r = HEX_MIN_R + ((HEX_MAX_R - HEX_MIN_R) * i) / (HEX_COUNT - 1);
              return (
                <motion.polygon
                  key={i}
                  points={hexPoints(CENTER.x, CENTER.y, r)}
                  fill="none"
                  stroke="var(--purple)"
                  strokeOpacity={0.35 - i * 0.02}
                  strokeWidth="1"
                  style={{ originX: "50%", originY: "50%" }}
                  animate={reduced ? undefined : { scale: [0.5, 1], opacity: [0, 1] }}
                  transition={
                    reduced
                      ? undefined
                      : {
                          duration: 2.5,
                          repeat: Infinity,
                          repeatType: "loop",
                          ease: "easeOut",
                          delay: i * 0.3,
                        }
                  }
                />
              );
            })}
          </motion.svg>

          {/* Center mark — abstract 2x2 block grid, floats gently so it never looks static */}
          <motion.div
            className="absolute grid grid-cols-2 gap-2"
            animate={reduced ? undefined : { y: [-5, 5, -5] }}
            transition={
              reduced
                ? undefined
                : { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white" />
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white/40" />
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white/40" />
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white" />
          </motion.div>

          {/* Stat callouts — desktop: pinned around the hex graphic */}
          <div className="hidden md:block absolute left-0 top-[18%]">
            <StatCallout {...STATS.topLeft} align="left" />
          </div>
          <div className="hidden md:block absolute left-0 bottom-[14%]">
            <StatCallout {...STATS.bottomLeft} align="left" />
          </div>
          <div className="hidden md:block absolute right-0 top-[18%]">
            <StatCallout {...STATS.topRight} align="right" />
          </div>
          <div className="hidden md:block absolute right-0 bottom-[14%]">
            <StatCallout {...STATS.bottomRight} align="right" />
          </div>
        </div>

        {/* Mobile: stats as a simple grid below the graphic */}
        <div className="grid grid-cols-2 gap-4 mt-8 md:hidden">
          {Object.values(STATS).map((stat) => (
            <div key={stat.label} className="relative inline-block w-fit">
              <div className="bg-[var(--purple)] text-white text-[11px] px-2.5 py-1">
                {stat.label}
              </div>
              <div className="bg-white text-black text-xl font-extrabold px-3 py-2">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
