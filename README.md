# Preflight

**A pre-send safety check for Solana transactions.** Preflight tells you whether to `SEND`, wait, or proceed with caution — before you pay for a transaction that's probably going to fail.

## The problem

Solana has no public mempool. When you submit a transaction, you have no visibility into what else is competing for the same accounts at the same moment. You are, effectively, sending blind.

The cost of that blindness is measurable:

- **58%** of bot transactions on Solana fail ([ISSTA 2025](https://conf.researchr.org/home/issta-2025), a study of 1.5B mainnet transactions).
- **78%** of failures in our own backtest of 600 mainnet transactions were contention-type errors — races on hot accounts (AMM pools, bonding curves, order books) that were predictable in advance, not random bad luck.
- **635 SOL** was burned in fees on a single program in a single month, paid for transactions that never had a chance of landing.

Existing fee tools estimate priority fees from historical percentiles. That's necessary but not sufficient — a transaction can pay a perfectly reasonable fee and still lose a race for a hot account it didn't know was hot. Nobody is checking the thing that actually determines whether a transaction lands: **real-time contention on the specific accounts it writes to.**

## What Preflight does

Preflight sits between "transaction built" and "transaction sent" and answers one question: *is this a good idea right now?*

Given a base64-encoded transaction, it returns a plain recommendation — **Send**, **Caution**, or **Wait** — backed by reasons a human can read, not a black-box score. Under the hood, three engines feed one deterministic decision:

1. **Contention Engine** — maintains a live WebSocket subscription (via Helius) to account activity on 8 high-traffic Solana programs (Jupiter, pump.fun, Raydium AMM/CLMM, Orca, Marinade, Tensor, Magic Eden). It counts competing writes per account over 1s / 5s / 30s windows and classifies each account as Low, Moderate, or High contention.
2. **Simulation Engine** — runs the transaction through `simulateTransaction` against a real RPC node, catching instruction-level failures, insufficient balances, and expired blockhashes before a single lamport is spent on fees.
3. **Recommendation Engine** — combines contention state, simulation result, and live priority-fee percentiles for the specific accounts involved into a single recommendation with an explicit, auditable reason chain (see `crates/preflight-core/src/recommendation/mod.rs`). No ML, no opaque scoring — every recommendation traces back to a named rule.

The result: instead of finding out a transaction failed after paying the fee, a wallet, bot, or trading interface can ask Preflight first and skip the failure entirely.

## How it's validated

Claims about contention-driven failure aren't taken on faith — `scripts/backtest.ts` replays hundreds of real failed mainnet transactions pulled via `scripts/pull_failed_txs.ts`, classifies each failure using the same rules the recommendation engine uses live, and reports what Preflight would have advised had it been consulted beforehand. That backtest is what produced the 78% contention-failure figure above, and it's re-runnable against fresh data at any time.

## Architecture

```
Wallet / Bot / Trading UI
        │  base64 transaction
        ▼
┌───────────────────────────────────────────────┐
│                 Preflight API (Rust / Axum)     │
│                                                 │
│   Contention Engine ──┐                        │
│   (Helius WS stream)  │                        │
│                        ├──▶ Recommendation      │
│   Simulation Engine ───┘      Engine            │
│   (RPC simulateTransaction)                     │
└───────────────────────────────────────────────┘
        │
        ▼
   { action: "Send" | "Caution" | "Wait", reasons: [...] }
```

- **`crates/preflight-core`** — the engines themselves: contention tracking, simulation, and the recommendation decision logic, each with its own test suite.
- **`crates/preflight-api`** — the HTTP surface (`/v1/analyze`, `/v1/status`, `/v1/program/:name`), plus an optional Lana-backed `/v1/chat` assistant for explaining a recommendation in natural language.
- **`sdk/`** — a TypeScript client for integrating Preflight into a wallet or bot (`@preflight/sdk`).
- **`frontend/`** — a React/Vite dashboard for exploring live network contention and testing transactions by hand.
- **`scripts/`** — the data pipeline behind the backtest: pulling failed transactions, verifying them, and scoring Preflight's would-have-been recommendations against reality.

## Why this belongs in the ecosystem

Transaction failure isn't a UX inconvenience on Solana — it's a direct wealth transfer from users to validators via wasted fees, concentrated on exactly the retail users and small bots least equipped to model contention themselves. Preflight is infrastructure, not an app: a wallet, an aggregator, or a bot framework can call `/v1/analyze` and give every user of that integration a materially lower failure rate without changing anything else about how they build transactions. It's the missing layer between "transaction is valid" and "transaction is a good idea," and it's built on live, verifiable network state rather than historical averages — with the methodology to prove it.

## Getting started

**Requirements:** Rust (stable), Node.js, a Helius RPC/WS endpoint.

```bash
# 1. Configure environment
cp .env.example .env   # set HELIUS_RPC_URL and HELIUS_WS_URL at minimum

# 2. Run the API
cargo run -p preflight-api

# 3. Run the frontend
cd frontend && npm install && npm run dev
```

Run the test suite:

```bash
cargo test --workspace
```

## API

| Method | Route                | Description                                              |
|--------|-----------------------|------------------------------------------------------------|
| `POST` | `/v1/analyze`         | Submit a base64 transaction, get a `Send`/`Caution`/`Wait` recommendation |
| `GET`  | `/v1/status`          | Current network-wide contention status across tracked programs |
| `GET`  | `/v1/program/:name`   | Contention level for a single tracked program             |
| `GET`  | `/health`             | Liveness check                                             |

## License

TBD.
