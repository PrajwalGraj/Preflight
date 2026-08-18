//! Server-side client for the Lana chat API.
//!
//! This module is the ONLY place that touches `LANA_KEY`. The key is read from
//! the environment at startup and never leaves the process — the browser talks
//! to `/v1/chat` on this server, which proxies to Lana on its behalf.

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Lana aborts a turn at 5 minutes; give up well before that so a hung
/// upstream can't pin one of our own connections open indefinitely.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

pub const MODEL_FAST: &str = "lana-fast";

#[derive(Debug)]
pub enum LanaError {
    /// Upstream rate limit (HTTP 429). Carries `Retry-After` seconds if sent.
    RateLimited { retry_after_secs: Option<u64> },
    /// Bad or missing API key (HTTP 401).
    Auth,
    /// Any other upstream failure, including transport errors.
    Upstream(String),
}

impl LanaError {
    /// Message safe to show an end user — never leaks upstream detail or keys.
    pub fn user_message(&self) -> &'static str {
        match self {
            LanaError::RateLimited { .. } => {
                "Preflight's assistant is receiving high demand right now — try again in a few minutes."
            }
            // An auth failure is our misconfiguration, not the user's problem,
            // so it gets the same neutral phrasing rather than a scary one.
            LanaError::Auth | LanaError::Upstream(_) => {
                "Preflight's assistant is temporarily unavailable. Please try again shortly."
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct LanaMessage {
    role: &'static str,
    content: String,
}

#[derive(Serialize)]
struct UserContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    wallet: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    address_kind: Option<&'static str>,
    network: &'static str,
}

#[derive(Serialize)]
struct Extensions {
    #[serde(skip_serializing_if = "Option::is_none")]
    user_context: Option<UserContext>,
    /// ALWAYS sent explicitly. Omitting it opts into deep archival scans
    /// (up to ~150 upstream requests for a single turn), which would consume
    /// our entire hourly budget in one call.
    enable_deep_scan: bool,
    include_followups: bool,
    include_ui_schema: bool,
    include_documents: bool,
}

#[derive(Serialize)]
struct LanaRequest {
    model: &'static str,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    stream: bool,
    messages: Vec<LanaMessage>,
    extensions: Extensions,
}

#[derive(Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    text: Option<String>,
}

#[derive(Deserialize)]
struct LanaResponse {
    #[serde(default)]
    content: Vec<ContentBlock>,
}

#[derive(Deserialize)]
struct ErrorDetail {
    #[serde(default)]
    message: String,
}

#[derive(Deserialize)]
struct ErrorEnvelope {
    #[serde(default)]
    error: Option<ErrorDetail>,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct LanaClient {
    http: reqwest::Client,
    host: String,
    key: String,
}

/// Optional per-call context passed through to Lana's `user_context`.
pub struct CallContext {
    pub wallet: Option<String>,
}

impl LanaClient {
    pub fn new(host: String, key: String) -> Self {
        Self {
            http: reqwest::Client::builder()
                .timeout(REQUEST_TIMEOUT)
                .build()
                .unwrap_or_default(),
            host: host.trim_end_matches('/').to_string(),
            key,
        }
    }

    /// Send one non-streaming turn and return the concatenated text blocks.
    pub async fn ask(
        &self,
        model: &'static str,
        system: Option<String>,
        user_message: String,
        max_tokens: u32,
        ctx: Option<CallContext>,
    ) -> Result<String, LanaError> {
        let body = LanaRequest {
            model,
            max_tokens,
            system,
            stream: false,
            messages: vec![LanaMessage {
                role: "user",
                content: user_message,
            }],
            extensions: Extensions {
                user_context: ctx.map(|c| UserContext {
                    address_kind: c.wallet.as_ref().map(|_| "wallet"),
                    wallet: c.wallet,
                    network: "mainnet",
                }),
                enable_deep_scan: false,
                include_followups: false,
                include_ui_schema: false,
                include_documents: false,
            },
        };

        let response = self
            .http
            .post(format!("{}/v1/messages", self.host))
            .header("content-type", "application/json")
            .header("x-api-key", &self.key)
            .json(&body)
            .send()
            .await
            .map_err(|e| LanaError::Upstream(format!("request failed: {e}")))?;

        let status = response.status();

        if !status.is_success() {
            // Read Retry-After before consuming the body.
            let retry_after_secs = response
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.trim().parse::<u64>().ok());

            let raw = response.text().await.unwrap_or_default();
            let detail = serde_json::from_str::<ErrorEnvelope>(&raw)
                .ok()
                .and_then(|e| e.error)
                .map(|e| e.message)
                .unwrap_or(raw);

            return Err(match status.as_u16() {
                429 => LanaError::RateLimited { retry_after_secs },
                401 => LanaError::Auth,
                code => LanaError::Upstream(format!("HTTP {code}: {detail}")),
            });
        }

        let parsed: LanaResponse = response
            .json()
            .await
            .map_err(|e| LanaError::Upstream(format!("malformed response: {e}")))?;

        // The visible answer is every `text` block joined in order; tool_use
        // and tool_result blocks are intentionally ignored.
        let text = parsed
            .content
            .iter()
            .filter(|b| b.kind == "text")
            .filter_map(|b| b.text.as_deref())
            .collect::<Vec<_>>()
            .join("")
            .trim()
            .to_string();

        if text.is_empty() {
            return Err(LanaError::Upstream("no text blocks in response".to_string()));
        }

        Ok(text)
    }
}
