import { useState } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ScrollProgress } from "../components/ScrollProgress";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 rounded text-xs bg-[var(--grey-border)] text-[var(--grey-text)] hover:text-white transition-colors duration-200 font-mono"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--grey-border)] my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--grey-card)] border-b border-[var(--grey-border)]">
        <span className="text-[var(--grey-text)] text-xs uppercase tracking-wide">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="bg-[var(--black)] p-5 font-mono text-sm text-white leading-relaxed overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-[var(--status-green)] border-[var(--status-green)]/30",
    POST: "text-[var(--yellow)] border-[var(--yellow)]/30",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono border bg-transparent ${
        colors[method] ?? "text-white border-white/30"
      }`}
    >
      {method}
    </span>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-20">
      <h2 className="text-2xl font-bold text-white mb-6 pb-4 border-b border-[var(--grey-border)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EndpointDoc({
  method,
  path,
  description,
  request,
  response,
  example,
}: {
  method: string;
  path: string;
  description: string;
  request?: string;
  response: string;
  example: string;
}) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-3">
        <MethodBadge method={method} />
        <code className="text-white font-mono text-lg font-semibold">{path}</code>
      </div>
      <p className="text-[var(--grey-text)] mb-4 leading-relaxed">{description}</p>
      {request && (
        <>
          <div className="text-xs uppercase tracking-widest text-[var(--grey-text)] mb-2">
            Request Body
          </div>
          <CodeBlock code={request} lang="json" />
        </>
      )}
      <div className="text-xs uppercase tracking-widest text-[var(--grey-text)] mb-2">
        Response
      </div>
      <CodeBlock code={response} lang="json" />
      <div className="text-xs uppercase tracking-widest text-[var(--grey-text)] mb-2">
        Example
      </div>
      <CodeBlock code={example} lang="bash" />
    </div>
  );
}

export function DocsPage() {
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "auth", label: "Authentication" },
    { id: "health", label: "GET /health" },
    { id: "status", label: "GET /v1/status" },
    { id: "program", label: "GET /v1/program/:name" },
    { id: "analyze", label: "POST /v1/analyze" },
    { id: "types", label: "Response Types" },
    { id: "sdk", label: "SDK" },
  ];

  return (
    <div className="min-h-screen bg-[var(--black)]">
      <ScrollProgress />
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        <div className="flex gap-16">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <div className="text-[var(--grey-text)] text-xs uppercase tracking-widest mb-4">
                Contents
              </div>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block px-3 py-2 rounded-lg text-sm text-[var(--grey-text)] hover:text-white hover:bg-[var(--grey-card)] transition-all duration-150"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-[var(--grey-border)]">
                <a
                  href="https://github.com/PrajwalGraj/Preflight"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-[var(--grey-text)] hover:text-white transition-colors"
                >
                  GitHub →
                </a>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Page header */}
            <div className="mb-16">
              <div className="text-[var(--yellow)] text-xs uppercase tracking-widest mb-3">
                API Reference
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Preflight API</h1>
              <p className="text-[var(--grey-text)] text-lg leading-relaxed max-w-2xl">
                Real-time Solana transaction advisory. No authentication required. Open
                source.
              </p>
            </div>

            {/* Overview */}
            <Section id="overview" title="Overview">
              <p className="text-[var(--grey-text)] leading-relaxed mb-4">
                The Preflight API provides real-time transaction advisory for Solana. It
                combines live account contention data (via WebSocket streams) with
                transaction simulation to recommend whether to send, wait, or adjust your
                priority fee.
              </p>
              <div className="rounded-xl p-5 bg-[var(--grey-card)] border border-[var(--grey-border)]">
                <div className="text-xs uppercase tracking-widest text-[var(--grey-text)] mb-3">
                  Base URL
                </div>
                <code className="text-[var(--yellow)] font-mono text-sm">
                  http://localhost:3000
                </code>
                <div className="mt-4 text-[var(--grey-text)] text-sm">
                  (Update to your deployed URL after self-hosting)
                </div>
              </div>
            </Section>

            {/* Authentication */}
            <Section id="auth" title="Authentication">
              <p className="text-[var(--grey-text)] leading-relaxed">
                No authentication required. The Preflight API is a public read-only
                service. All endpoints are accessible without API keys or tokens.
              </p>
              <div className="mt-4 rounded-xl p-5 bg-[var(--grey-card)] border-l-4 border-[var(--yellow)] border border-[var(--grey-border)]">
                <p className="text-[var(--grey-text)] text-sm">
                  CORS is enabled for all origins. You can call the API directly from any
                  frontend application without a proxy.
                </p>
              </div>
            </Section>

            {/* Endpoints */}
            <Section id="health" title="GET /health">
              <EndpointDoc
                method="GET"
                path="/health"
                description="Liveness check. Returns 200 when the API server is running."
                response={`{
  "status": "ok",
  "service": "preflight-api"
}`}
                example={`curl http://localhost:3000/health`}
              />
            </Section>

            <Section id="status" title="GET /v1/status">
              <EndpointDoc
                method="GET"
                path="/v1/status"
                description="Returns current network health and contention levels for all 8 monitored Solana programs. Poll this endpoint every 10 seconds for a live dashboard."
                response={`{
  "network": "healthy",
  "programs": [
    { "name": "jupiter",     "level": "Low"  },
    { "name": "pumpfun",     "level": "High" },
    { "name": "raydium_amm", "level": "Low"  },
    { "name": "raydium_clmm","level": "Low"  },
    { "name": "orca",        "level": "Low"  },
    { "name": "marinade",    "level": "Low"  },
    { "name": "tensor",      "level": "Low"  },
    { "name": "magic_eden",  "level": "Low"  }
  ],
  "data_freshness_ms": 142,
  "updated_at": "2026-08-04T10:22:01Z"
}`}
                example={`curl http://localhost:3000/v1/status`}
              />
              <div className="rounded-xl p-5 bg-[var(--grey-card)] border border-[var(--grey-border)] mt-4">
                <div className="text-xs uppercase tracking-widest text-[var(--grey-text)] mb-3">
                  Network values
                </div>
                <div className="space-y-2 font-mono text-sm">
                  {[
                    ["healthy", "All programs Low"],
                    ["moderate", "At least one program Moderate"],
                    ["congested", "At least one program High"],
                  ].map(([val, desc]) => (
                    <div key={val} className="flex gap-4">
                      <span className="text-[var(--yellow)] w-24">{val}</span>
                      <span className="text-[var(--grey-text)]">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section id="program" title="GET /v1/program/:name">
              <EndpointDoc
                method="GET"
                path="/v1/program/:name"
                description="Returns live contention data for a specific program. Replace :name with one of the 8 supported program names."
                response={`{
  "program": "jupiter",
  "level": "Low",
  "data_freshness_ms": 203
}`}
                example={`curl http://localhost:3000/v1/program/jupiter
curl http://localhost:3000/v1/program/pumpfun`}
              />
              <div className="rounded-xl p-5 bg-[var(--grey-card)] border border-[var(--grey-border)] mt-4">
                <div className="text-xs uppercase tracking-widest text-[var(--grey-text)] mb-3">
                  Valid program names
                </div>
                <div className="font-mono text-sm text-[var(--grey-text)] flex flex-wrap gap-2">
                  {[
                    "jupiter",
                    "pumpfun",
                    "raydium_amm",
                    "raydium_clmm",
                    "orca",
                    "marinade",
                    "tensor",
                    "magic_eden",
                  ].map((n) => (
                    <span
                      key={n}
                      className="px-2 py-1 rounded bg-[var(--black)] border border-[var(--grey-border)]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <div className="mt-4 text-sm text-[var(--grey-text)]">
                  Returns <code className="text-[var(--status-red)]">404</code> for unknown
                  program names.
                </div>
              </div>
            </Section>

            <Section id="analyze" title="POST /v1/analyze">
              <EndpointDoc
                method="POST"
                path="/v1/analyze"
                description="Analyze a serialized Solana transaction before sending. Returns a recommendation with action, suggested priority fee, and plain English reasons."
                request={`{
  "transaction": "<base64-encoded serialized transaction>"
}`}
                response={`{
  "action": "Caution",
  "recommended_priority_fee": 28000,
  "reasons": [
    "Moderate contention on 58oQChx4... — increasing priority fee improves landing probability."
  ],
  "contention": [
    {
      "address": "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2",
      "tx_per_1s": 12,
      "tx_per_5s": 58,
      "tx_per_30s": 143,
      "level": "Moderate"
    }
  ],
  "simulation": {
    "success": true,
    "error": null,
    "compute_units_used": 142000,
    "blockhash_slots_remaining": 98,
    "logs": []
  },
  "data_freshness": {
    "last_update_ms": 87,
    "is_stale": false
  },
  "analyzed_at_slot": 284532100
}`}
                example={`curl -X POST http://localhost:3000/v1/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"transaction":"<base64 tx here>"}'`}
              />
              <div className="rounded-xl p-5 bg-[var(--grey-card)] border border-[var(--grey-border)] mt-4">
                <div className="text-xs uppercase tracking-widest text-[var(--grey-text)] mb-3">
                  Action values
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    {
                      action: "Send",
                      color: "text-[var(--status-green)]",
                      desc: "Low contention, simulation passed. Safe to send at recommended fee.",
                    },
                    {
                      action: "Caution",
                      color: "text-[var(--yellow)]",
                      desc: "Moderate contention or fee adjustment needed. Check the reasons array.",
                    },
                    {
                      action: "Wait",
                      color: "text-[var(--status-red)]",
                      desc: "High contention. Wait 2–5 minutes or significantly increase fee.",
                    },
                  ].map((item) => (
                    <div key={item.action} className="flex gap-4">
                      <span className={`font-mono font-bold w-20 flex-shrink-0 ${item.color}`}>
                        {item.action}
                      </span>
                      <span className="text-[var(--grey-text)]">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Response Types */}
            <Section id="types" title="Response Types">
              <p className="text-[var(--grey-text)] mb-6 leading-relaxed">
                All responses are JSON. Contention levels are always one of:{" "}
                <code className="text-[var(--yellow)]">Low</code>,{" "}
                <code className="text-[var(--yellow)]">Moderate</code>, or{" "}
                <code className="text-[var(--yellow)]">High</code>.
              </p>
              <CodeBlock
                lang="typescript"
                code={`type Action  = 'Send' | 'Caution' | 'Wait';
type Level   = 'Low' | 'Moderate' | 'High';
type Network = 'healthy' | 'moderate' | 'congested';

interface AccountContention {
  address:      string;   // base58 pubkey
  tx_per_1s:    number;
  tx_per_5s:    number;
  tx_per_30s:   number;
  level:        Level;
}

interface SimulationResult {
  success:                   boolean;
  error:                     string | null;
  compute_units_used:        number;
  blockhash_slots_remaining: number;
  logs:                      string[];
}

interface Recommendation {
  action:                   Action;
  recommended_priority_fee: number;  // micro-lamports
  reasons:                  string[];
  contention:               AccountContention[];
  simulation:               SimulationResult;
  data_freshness: {
    last_update_ms: number;
    is_stale:       boolean;
  };
  analyzed_at_slot: number;
}`}
              />
            </Section>

            {/* SDK */}
            <Section id="sdk" title="SDK">
              <p className="text-[var(--grey-text)] mb-6 leading-relaxed">
                A TypeScript SDK is in development. For now, call the REST API directly or
                use the examples below.
              </p>
              <CodeBlock
                lang="typescript"
                code={`// Fetch network status
const res = await fetch('http://localhost:3000/v1/status');
const status = await res.json();
console.log(status.network); // "healthy"

// Check a specific program
const prog = await fetch(
  'http://localhost:3000/v1/program/jupiter'
);
const data = await prog.json();
console.log(data.level); // "Low" | "Moderate" | "High"

// Analyze a transaction
const rec = await fetch('http://localhost:3000/v1/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transaction: base64Tx }),
});
const advice = await rec.json();
console.log(advice.action);                    // "Send"
console.log(advice.recommended_priority_fee);  // 8000
console.log(advice.reasons);                   // [...]`}
              />
            </Section>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
