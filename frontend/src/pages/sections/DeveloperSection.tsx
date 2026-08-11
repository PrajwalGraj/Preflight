import type { ReactNode } from "react";
import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import { fetchStatus } from "../../api/client";
import { Reveal } from "../../components/Reveal";
import { SectionHeading } from "../../components/SectionHeading";
import { EASE_OUT } from "../../lib/motion";

const ENDPOINTS = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/v1/status" },
  { method: "GET", path: "/v1/program/:name" },
  { method: "POST", path: "/v1/analyze" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "text-[var(--status-green)] border-[var(--status-green)]/30 bg-[var(--status-green)]/10",
  POST: "text-[var(--yellow)] border-[var(--yellow)]/30 bg-[var(--yellow)]/10",
};

// Tokenizes a JSON string and colors keys vs. values separately.
const JSON_TOKEN_RE =
  /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function highlightJson(json: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = JSON_TOKEN_RE.exec(json)) !== null) {
    if (match.index > lastIndex) {
      parts.push(json.slice(lastIndex, match.index));
    }

    const token = match[0];
    const isKey = token.startsWith('"') && token.trimEnd().endsWith(":");
    const className = isKey ? "text-[var(--yellow)]" : "text-[var(--purple)]";

    parts.push(
      <span key={key++} className={className}>
        {token}
      </span>
    );
    lastIndex = JSON_TOKEN_RE.lastIndex;
  }

  if (lastIndex < json.length) {
    parts.push(json.slice(lastIndex));
  }

  return parts;
}

export function DeveloperSection() {
  const reduced = useReducedMotion();

  // Data fetching untouched — motion only wraps it.
  const { data } = useSWR("status-dev", fetchStatus, {
    refreshInterval: 10_000,
  });

  const liveJson = data
    ? JSON.stringify(
        {
          network: data.network,
          programs: data.programs.slice(0, 3).map((p) => ({
            name: p.name,
            level: p.level,
          })),
          data_freshness_ms: data.data_freshness_ms,
          updated_at: data.updated_at,
        },
        null,
        2
      )
    : '{ "loading": true }';

  return (
    <section id="developer" className="relative bg-black rule-b">
        <div className="max-w-7xl mx-auto rule-x px-8 md:px-14 py-20">
      <SectionHeading
        className="mb-16"
        label="For Developers"
        title="One call, one answer"
        subtitle="REST API and TypeScript SDK. No authentication required. Open source, self-hostable."
      />

      {/* Two columns */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* REST API */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 16 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          whileHover={reduced ? undefined : { y: -4, borderColor: "#8f71d3" }}
          className="group p-7 border border-[var(--rule)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-black border border-[var(--rule)] flex items-center justify-center text-lg group-hover:border-[var(--purple)] transition-colors duration-200">
              ⚡
            </div>
            <div className="text-white font-semibold text-sm">REST API</div>
          </div>

          <div className="space-y-2">
            {ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                className="flex items-center gap-3 bg-black px-3 py-2 border border-[var(--rule)]"
              >
                <span
                  className={`shrink-0 px-2 py-0.5 text-[10px] font-bold font-mono border ${METHOD_COLORS[ep.method]}`}
                >
                  {ep.method}
                </span>
                <span className="font-mono text-[13px] text-white truncate">{ep.path}</span>
              </div>
            ))}
          </div>

          <a
            href="/docs"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--yellow)] hover:text-white transition-colors"
          >
            View full docs →
          </a>
        </motion.div>

        {/* SDK */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 16 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
          whileHover={reduced ? undefined : { y: -4, borderColor: "#8f71d3" }}
          className="group p-7 border border-[var(--rule)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-black border border-[var(--rule)] flex items-center justify-center text-lg group-hover:border-[var(--purple)] transition-colors duration-200">
              📦
            </div>
            <div className="text-white font-semibold text-sm">TypeScript SDK</div>
          </div>

          <div className="bg-black border border-[var(--rule)] overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--grey-border)] text-[10px] uppercase tracking-widest text-[var(--grey-text)]">
              install
            </div>
            <div className="px-4 py-3 font-mono text-xs text-[var(--status-green)]">
              $ npm i @preflight/sdk
            </div>
          </div>

          <div className="mt-3 bg-black border border-[var(--rule)] p-4 font-mono text-xs leading-relaxed">
            <div>
              <span className="text-[var(--purple)]">import</span>
              <span className="text-white"> {"{ Preflight }"} </span>
              <span className="text-[var(--purple)]">from</span>
              <span className="text-[var(--status-green)]">{" '@preflight/sdk'"}</span>
            </div>
            <div className="mt-2">
              <span className="text-[var(--purple)]">const</span>
              <span className="text-white"> rec = </span>
              <span className="text-[var(--purple)]">await</span>
              <span className="text-white"> preflight.analyze(tx)</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-[var(--grey-text)]">
            Coming soon — v1 SDK in progress
          </div>
        </motion.div>
      </div>

      {/* Live API example */}
      <Reveal className="relative z-10 overflow-hidden border border-[var(--rule)]">
        <div className="px-5 py-3 border-b border-[var(--grey-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-[10px] font-bold font-mono border text-[var(--status-green)] border-[var(--status-green)]/30 bg-[var(--status-green)]/10">
              GET
            </span>
            <span className="font-mono text-sm text-white">/v1/status</span>
          </div>
          <div className="text-xs text-[var(--status-green)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[var(--status-green)] animate-pulse" />
            live
          </div>
        </div>
        <div className="bg-black p-5 font-mono text-[13px] leading-[1.8] overflow-x-auto">
          <pre className="text-[var(--grey-text)]">{highlightJson(liveJson)}</pre>
        </div>
      </Reveal>
        </div>
    </section>
  );
}
