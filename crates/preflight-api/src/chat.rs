//! `POST /v1/chat` — the assistant surface.
//!
//! Two modes, one rule in common: Lana is used for *language*, never as a
//! source of truth about Preflight's data. Program status comes from our own
//! ContentionEngine; wallet failures come from our own RecommendationEngine.
//! Lana is handed those findings and asked to phrase them.

use crate::lana::{CallContext, LanaError, MODEL_FAST};
use crate::AppState;
use axum::extract::{ConnectInfo, State};
use axum::http::StatusCode;
use axum::Json;
use preflight_core::{Action, ContentionLevel, WalletDiagnosis};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

const KNOWN_PROGRAMS: [&str; 8] = [
    "jupiter",
    "pumpfun",
    "raydium_amm",
    "raydium_clmm",
    "orca",
    "marinade",
    "tensor",
    "magic_eden",
];

#[derive(Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub mode: String,
    #[serde(default)]
    pub wallet: Option<String>,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub reply: String,
}

/// Maps a Lana failure onto an HTTP status plus a user-safe message.
fn lana_error_response(err: LanaError) -> (StatusCode, Json<ChatResponse>) {
    let status = match err {
        LanaError::RateLimited { .. } => StatusCode::TOO_MANY_REQUESTS,
        _ => StatusCode::BAD_GATEWAY,
    };

    // Log the real detail server-side; the client only ever sees the safe text.
    match &err {
        LanaError::RateLimited { retry_after_secs } => {
            tracing::warn!(retry_after = ?retry_after_secs, "lana rate limited");
        }
        LanaError::Auth => tracing::error!("lana rejected our API key — check LANA_KEY"),
        LanaError::Upstream(detail) => tracing::error!(%detail, "lana upstream failure"),
    }

    (
        status,
        Json(ChatResponse {
            reply: err.user_message().to_string(),
        }),
    )
}

pub async fn chat_handler(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(req): Json<ChatRequest>,
) -> (StatusCode, Json<ChatResponse>) {
    if !state.rate_limiter.check(addr.ip()) {
        tracing::warn!(ip = %addr.ip(), "chat rate limit hit");
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(ChatResponse {
                reply: "You've reached the request limit for now — please try again later."
                    .to_string(),
            }),
        );
    }

    let message = req.message.trim().to_string();
    if message.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ChatResponse {
                reply: "Please enter a question.".to_string(),
            }),
        );
    }

    let Some(lana) = state.lana.clone() else {
        tracing::error!("chat called but LANA_KEY is not configured");
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ChatResponse {
                reply: "Preflight's assistant is not configured on this server.".to_string(),
            }),
        );
    };

    match req.mode.as_str() {
        "homepage" => homepage_mode(&state, &lana, message).await,
        "wallet" => match req.wallet.as_deref().map(str::trim).filter(|w| !w.is_empty()) {
            Some(wallet) => wallet_mode(&state, &lana, message, wallet.to_string()).await,
            None => (
                StatusCode::BAD_REQUEST,
                Json(ChatResponse {
                    reply: "A connected wallet is required for this question.".to_string(),
                }),
            ),
        },
        other => {
            tracing::warn!(mode = %other, "unknown chat mode");
            (
                StatusCode::BAD_REQUEST,
                Json(ChatResponse {
                    reply: "Unsupported chat mode.".to_string(),
                }),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Homepage mode
// ---------------------------------------------------------------------------

const RESOLVE_SYSTEM: &str = "You are a router for Preflight, a Solana transaction advisory service. \
Decide which single tracked program the user's message is about. \
Reply with EXACTLY ONE of these tokens and absolutely nothing else — no punctuation, \
no explanation, no quotes: jupiter, pumpfun, raydium_amm, raydium_clmm, orca, marinade, \
tensor, magic_eden, unknown. \
Use 'unknown' if the message is not asking about the live status of one of those programs.";

const GENERAL_SYSTEM: &str = "You are Preflight's assistant. Preflight is a real-time Solana \
transaction advisory service that measures live account contention, simulates transactions, \
and recommends SEND, CAUTION or WAIT before a user signs. \
Answer the user's Solana question clearly in 2-4 sentences. \
If they are asking about the live status of a specific program, note that Preflight tracks \
jupiter, pumpfun, raydium_amm, raydium_clmm, orca, marinade, tensor and magic_eden, and \
invite them to ask about one by name. Never invent live figures — you do not have access \
to Preflight's live data.";

fn phrase_system() -> String {
    "You are Preflight's assistant. You will be given a program name and its current \
contention level, measured by Preflight just now. Rephrase it as ONE friendly, concise \
sentence for a user deciding whether to transact. \
Low means conditions are good to send. Moderate means it will likely land but a higher \
priority fee helps. High means they should wait. \
Use only the data given — do not add figures, do not look anything up."
        .to_string()
}

fn level_word(level: &ContentionLevel) -> &'static str {
    match level {
        ContentionLevel::Low => "Low",
        ContentionLevel::Moderate => "Moderate",
        ContentionLevel::High => "High",
    }
}

async fn homepage_mode(
    state: &AppState,
    lana: &crate::lana::LanaClient,
    message: String,
) -> (StatusCode, Json<ChatResponse>) {
    // Step 1 — resolve the message to a program name (Lana as a classifier).
    let resolved = match lana
        .ask(
            MODEL_FAST,
            Some(RESOLVE_SYSTEM.to_string()),
            message.clone(),
            16,
            None,
        )
        .await
    {
        Ok(text) => text,
        Err(e) => return lana_error_response(e),
    };

    let normalized = resolved
        .trim()
        .trim_matches(|c: char| !c.is_alphanumeric() && c != '_')
        .to_lowercase();

    let program = KNOWN_PROGRAMS.iter().find(|p| **p == normalized).copied();

    match program {
        // Step 2 — known program: answer from OUR data, Lana only phrases it.
        Some(name) => {
            let level = state
                .engine
                .program_status()
                .into_iter()
                .find(|(n, _)| n == name)
                .map(|(_, l)| l)
                .unwrap_or(ContentionLevel::Low);

            tracing::info!(
                program = %name,
                level = ?level,
                "chat/homepage resolved to a tracked program — answering from Preflight data"
            );

            let facts = format!(
                "Program: {}. Contention level measured by Preflight: {}.",
                name,
                level_word(&level)
            );

            match lana
                .ask(MODEL_FAST, Some(phrase_system()), facts, 256, None)
                .await
            {
                Ok(reply) => (StatusCode::OK, Json(ChatResponse { reply })),
                Err(e) => lana_error_response(e),
            }
        }

        // Step 3 — general Solana question, Lana's own knowledge.
        None => {
            tracing::info!(
                resolved = %normalized,
                "chat/homepage unresolved — answering as a general question"
            );

            match lana
                .ask(
                    MODEL_FAST,
                    Some(GENERAL_SYSTEM.to_string()),
                    message,
                    512,
                    None,
                )
                .await
            {
                Ok(reply) => (StatusCode::OK, Json(ChatResponse { reply })),
                Err(e) => lana_error_response(e),
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Wallet mode
// ---------------------------------------------------------------------------

const DIAGNOSE_SYSTEM: &str = "You are Preflight's diagnostic assistant. \
You will be given the results of an analysis Preflight has ALREADY performed on the user's \
wallet, followed by their question. \
Explain the findings using ONLY the data provided. Do NOT investigate the wallet \
independently, do NOT look up any transactions, and do NOT invent numbers or signatures. \
Be direct and practical in 3-6 sentences: what went wrong, how much it cost, and what \
Preflight would have advised. If the data shows contention-driven failures, explain that \
those are exactly the failures Preflight is designed to prevent by advising WAIT.";

/// Render the diagnosis as plain text facts for Lana to explain.
fn format_diagnosis(d: &WalletDiagnosis) -> String {
    let mut out = String::new();

    out.push_str(&format!(
        "Wallet: {}\nRecent transactions scanned: {}\nFailed transactions found: {}\nOf those, contention-driven: {}\nTotal lamports spent on failed transactions: {}\n\n",
        d.wallet,
        d.transactions_scanned,
        d.failures.len(),
        d.contention_failures,
        d.lamports_wasted
    ));

    out.push_str("Individual failures:\n");
    for (i, f) in d.failures.iter().enumerate() {
        let action = match f.action {
            Action::Send => "SEND",
            Action::Caution => "CAUTION",
            Action::Wait => "WAIT",
        };
        out.push_str(&format!(
            "{}. slot {} — Preflight would have advised {}. Reason: {} Fee paid: {} lamports.\n",
            i + 1,
            f.slot,
            action,
            f.reason,
            f.fee
        ));
    }

    out
}

async fn wallet_mode(
    state: &AppState,
    lana: &crate::lana::LanaClient,
    message: String,
    wallet: String,
) -> (StatusCode, Json<ChatResponse>) {
    let diagnosis = state.engine.diagnose_wallet(&wallet, 10).await;

    tracing::info!(
        wallet = %wallet,
        scanned = diagnosis.transactions_scanned,
        failures = diagnosis.failures.len(),
        contention = diagnosis.contention_failures,
        "chat/wallet diagnosis complete — feeding Preflight's own findings to Lana"
    );

    // No failures: answer directly and skip the upstream call entirely.
    if diagnosis.failures.is_empty() {
        let reply = if diagnosis.transactions_scanned == 0 {
            "I couldn't find any recent transaction history for this wallet on mainnet. \
             Once it has some activity, come back and I'll check it for failures."
                .to_string()
        } else {
            format!(
                "Good news — none of the last {} transactions from this wallet failed. \
                 Nothing to diagnose. Preflight will keep watching contention if you check \
                 a program before your next send.",
                diagnosis.transactions_scanned
            )
        };
        return (StatusCode::OK, Json(ChatResponse { reply }));
    }

    let payload = format!(
        "{}\nThe user asks: {}",
        format_diagnosis(&diagnosis),
        message
    );

    match lana
        .ask(
            MODEL_FAST,
            Some(DIAGNOSE_SYSTEM.to_string()),
            payload,
            768,
            // user_context tells Lana whose wallet this is; it does not grant
            // it permission to go look the wallet up, and the system prompt
            // explicitly forbids that.
            Some(CallContext {
                wallet: Some(wallet),
            }),
        )
        .await
    {
        Ok(reply) => (StatusCode::OK, Json(ChatResponse { reply })),
        Err(e) => lana_error_response(e),
    }
}
