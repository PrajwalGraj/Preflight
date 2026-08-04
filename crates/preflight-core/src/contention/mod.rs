#[cfg(test)]
mod tests;

use crate::types::{AccountContention, ContentionLevel, DataFreshness};
use dashmap::{DashMap, DashSet};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

pub const PROGRAMS: &[(&str, &str)] = &[
    ("jupiter", "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
    ("pumpfun", "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
    ("raydium_amm", "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"),
    ("raydium_clmm", "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"),
    ("orca", "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"),
    ("marinade", "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"),
    ("tensor", "TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp"),
    ("magic_eden", "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K"),
];

const WINDOW_1S: Duration = Duration::from_secs(1);
const WINDOW_5S: Duration = Duration::from_secs(5);
const WINDOW_30S: Duration = Duration::from_secs(30);
const STALE_THRESHOLD_MS: u64 = 500;
const RECONNECT_DELAY: Duration = Duration::from_secs(2);

type AccountTimestamps = Arc<DashMap<String, Vec<Instant>>>;
type AccountsByProgram = Arc<DashMap<String, DashSet<String>>>;
type SubscriptionProgramMap = Arc<DashMap<u64, String>>;

pub struct ContentionEngine {
    timestamps: AccountTimestamps,

    // Tracks when we last received ANY WS notification
    // Used to detect stale data
    last_notification: Arc<AtomicU64>, // unix ms

    // The WS URL
    ws_url: String,

    // Which accounts have been observed for each program name,
    // built from the subscription -> program mapping below
    accounts_by_program: AccountsByProgram,

    // Maps a live subscription id (assigned by the server) back to
    // the program name we subscribed for. Rebuilt on every reconnect.
    subscription_program_map: SubscriptionProgramMap,
}

impl ContentionEngine {
    pub fn new(ws_url: String) -> Self {
        Self {
            timestamps: Arc::new(DashMap::new()),
            last_notification: Arc::new(AtomicU64::new(0)),
            ws_url,
            accounts_by_program: Arc::new(DashMap::new()),
            subscription_program_map: Arc::new(DashMap::new()),
        }
    }

    pub async fn start(&self) -> anyhow::Result<()> {
        let ws_url = self.ws_url.clone();
        let timestamps = self.timestamps.clone();
        let last_notification = self.last_notification.clone();
        let accounts_by_program = self.accounts_by_program.clone();
        let subscription_program_map = self.subscription_program_map.clone();

        tokio::spawn(async move {
            loop {
                let result = run_connection(
                    &ws_url,
                    &timestamps,
                    &last_notification,
                    &accounts_by_program,
                    &subscription_program_map,
                )
                .await;

                if let Err(e) = result {
                    tracing::warn!("ContentionEngine WebSocket error: {e:#}");
                }

                tokio::time::sleep(RECONNECT_DELAY).await;
            }
        });

        Ok(())
    }

    pub fn query(&self, accounts: &[String]) -> Vec<AccountContention> {
        let now = Instant::now();
        accounts
            .iter()
            .map(|address| {
                let (tx_per_1s, tx_per_5s, tx_per_30s) = match self.timestamps.get(address) {
                    Some(entry) => count_windows(entry.value(), now),
                    None => (0, 0, 0),
                };

                AccountContention {
                    address: address.clone(),
                    tx_per_1s,
                    tx_per_5s,
                    tx_per_30s,
                    level: level_from_tx_per_5s(tx_per_5s),
                }
            })
            .collect()
    }

    pub fn program_level(&self, program_name: &str) -> Option<ContentionLevel> {
        if !PROGRAMS.iter().any(|(name, _)| *name == program_name) {
            return None;
        }

        let accounts: Vec<String> = match self.accounts_by_program.get(program_name) {
            Some(set) => set.iter().map(|a| a.clone()).collect(),
            None => return Some(ContentionLevel::Low),
        };

        if accounts.is_empty() {
            return Some(ContentionLevel::Low);
        }

        let highest = self
            .query(&accounts)
            .into_iter()
            .map(|c| level_rank(&c.level))
            .max()
            .unwrap_or(0);

        Some(level_from_rank(highest))
    }

    pub fn freshness(&self) -> DataFreshness {
        let now_ms = current_unix_ms();
        let last = self.last_notification.load(Ordering::Relaxed);
        let last_update_ms = now_ms.saturating_sub(last);

        DataFreshness {
            last_update_ms,
            is_stale: last_update_ms > STALE_THRESHOLD_MS,
        }
    }

    pub fn total_timestamps_tracked(&self) -> usize {
        self.timestamps.iter().map(|entry| entry.value().len()).sum()
    }

    pub fn cleanup_old_timestamps(&self) {
        let now = Instant::now();
        self.timestamps.retain(|_, timestamps| {
            timestamps.retain(|ts| now.duration_since(*ts) <= WINDOW_30S);
            !timestamps.is_empty()
        });
    }
}

fn count_windows(timestamps: &[Instant], now: Instant) -> (u64, u64, u64) {
    let mut c1 = 0u64;
    let mut c5 = 0u64;
    let mut c30 = 0u64;

    for ts in timestamps {
        let age = now.duration_since(*ts);
        if age <= WINDOW_1S {
            c1 += 1;
        }
        if age <= WINDOW_5S {
            c5 += 1;
        }
        if age <= WINDOW_30S {
            c30 += 1;
        }
    }

    (c1, c5, c30)
}

fn level_from_tx_per_5s(tx_per_5s: u64) -> ContentionLevel {
    if tx_per_5s > 500 {
        ContentionLevel::High
    } else if tx_per_5s >= 50 {
        ContentionLevel::Moderate
    } else {
        ContentionLevel::Low
    }
}

fn level_rank(level: &ContentionLevel) -> u8 {
    match level {
        ContentionLevel::Low => 0,
        ContentionLevel::Moderate => 1,
        ContentionLevel::High => 2,
    }
}

fn level_from_rank(rank: u8) -> ContentionLevel {
    match rank {
        0 => ContentionLevel::Low,
        1 => ContentionLevel::Moderate,
        _ => ContentionLevel::High,
    }
}

fn current_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

async fn run_connection(
    ws_url: &str,
    timestamps: &AccountTimestamps,
    last_notification: &Arc<AtomicU64>,
    accounts_by_program: &AccountsByProgram,
    subscription_program_map: &SubscriptionProgramMap,
) -> anyhow::Result<()> {
    let (mut ws_stream, _) = connect_async(ws_url).await?;

    // Subscription ids are per-connection; rebuild the mapping fresh
    // on every (re)connect.
    subscription_program_map.clear();
    let mut request_id_to_program: HashMap<u64, &'static str> = HashMap::new();

    for (idx, (name, program_id)) in PROGRAMS.iter().enumerate() {
        let request_id = (idx + 1) as u64;
        request_id_to_program.insert(request_id, name);

        let subscribe_request = json!({
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "programSubscribe",
            "params": [
                program_id,
                {
                    "encoding": "base64",
                    "commitment": "confirmed"
                }
            ]
        });

        ws_stream
            .send(Message::Text(subscribe_request.to_string()))
            .await?;
    }

    loop {
        let msg = match ws_stream.next().await {
            Some(Ok(msg)) => msg,
            Some(Err(e)) => return Err(anyhow::anyhow!("websocket read error: {e}")),
            None => return Err(anyhow::anyhow!("websocket stream closed")),
        };

        let text = match msg {
            Message::Text(t) => t,
            Message::Close(_) => return Err(anyhow::anyhow!("websocket closed by server")),
            _ => continue,
        };

        let parsed: Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => continue,
        };

        // Subscription confirmation: {"jsonrpc":"2.0","result":SUB_ID,"id":REQ_ID}
        if let (Some(sub_id), Some(req_id)) = (
            parsed.get("result").and_then(Value::as_u64),
            parsed.get("id").and_then(Value::as_u64),
        ) {
            if let Some(program_name) = request_id_to_program.get(&req_id) {
                subscription_program_map.insert(sub_id, program_name.to_string());
            }
            continue;
        }

        if parsed.get("method").and_then(Value::as_str) != Some("programNotification") {
            continue;
        }

        let sub_id = parsed.pointer("/params/subscription").and_then(Value::as_u64);
        let pubkey = parsed
            .pointer("/params/result/value/pubkey")
            .and_then(Value::as_str);

        let Some(pubkey) = pubkey else { continue };

        timestamps
            .entry(pubkey.to_string())
            .or_default()
            .push(Instant::now());

        if let Some(sub_id) = sub_id {
            if let Some(program_name) = subscription_program_map.get(&sub_id) {
                accounts_by_program
                    .entry(program_name.clone())
                    .or_default()
                    .insert(pubkey.to_string());
            }
        }

        last_notification.store(current_unix_ms(), Ordering::Relaxed);
    }
}
