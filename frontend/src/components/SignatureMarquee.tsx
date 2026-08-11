import { useMemo } from "react";
import type { CSSProperties } from "react";

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SIGNATURE_LENGTH = 87;
const ROW_COUNT = 26;
const SIGNATURES_PER_ROW = 22;
const ROW_DURATIONS_S = [95, 130, 80, 150, 105, 125, 88, 140, 100, 115];
const REVEAL_RADIUS_PX = 160;

function randomSignature(): string {
  let out = "";
  for (let i = 0; i < SIGNATURE_LENGTH; i++) {
    out += BASE58_CHARS[Math.floor(Math.random() * BASE58_CHARS.length)];
  }
  return out;
}

function buildRow(): string[] {
  return Array.from({ length: SIGNATURES_PER_ROW }, randomSignature);
}

const REVEAL_MASK = `radial-gradient(circle ${REVEAL_RADIUS_PX}px at var(--mx, -9999px) var(--my, -9999px), black 0%, black 35%, transparent 70%)`;

/**
 * Ambient background of scrolling fake transaction signatures. Reads
 * --mx/--my custom properties (set by an ancestor's mousemove handler)
 * to reveal full-opacity text in a soft circle around the cursor.
 */
export function SignatureMarquee() {
  const rows = useMemo(() => Array.from({ length: ROW_COUNT }, buildRow), []);

  const renderRows = (textClassName: string) => (
    <div className={`absolute inset-0 flex flex-col justify-center gap-y-2 ${textClassName}`}>
      {rows.map((row, i) => (
        <div key={i} className="overflow-hidden whitespace-nowrap shrink-0">
          <div
            className="inline-flex gap-x-10 font-mono text-sm"
            style={{
              animation: `marquee-left ${ROW_DURATIONS_S[i % ROW_DURATIONS_S.length]}s linear infinite`,
            }}
          >
            {[...row, ...row].map((sig, idx) => (
              <span key={idx}>{sig}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const revealLayerStyle: CSSProperties = {
    WebkitMaskImage: REVEAL_MASK,
    maskImage: REVEAL_MASK,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Dim base layer — always faintly visible */}
      {renderRows("text-white/20")}

      {/* Bright layer — only shows inside the cursor-following mask */}
      <div className="absolute inset-0" style={revealLayerStyle}>
        {renderRows("text-white")}
      </div>
    </div>
  );
}
