use anyhow::{anyhow, Context, Result};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

const PUMPFUN_PROGRAM_ID: &str = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const TARGET_UPDATES: usize = 10;
const OVERALL_TIMEOUT_SECS: u64 = 30;

#[tokio::main]
async fn main() {
    if let Err(e) = run().await {
        eprintln!("ERROR: {e:#}");
        std::process::exit(1);
    }
}

async fn run() -> Result<()> {
    dotenvy::dotenv().ok();
    let ws_url = std::env::var("HELIUS_WS_URL")
        .context("HELIUS_WS_URL not set in environment/.env")?;

    if ws_url.trim().is_empty() {
        return Err(anyhow!("HELIUS_WS_URL is empty — set it in .env"));
    }

    timeout(Duration::from_secs(OVERALL_TIMEOUT_SECS), subscribe_and_listen(&ws_url))
        .await
        .map_err(|_| {
            anyhow!(
                "Timed out after {}s with 0 account updates received",
                OVERALL_TIMEOUT_SECS
            )
        })?
}

async fn subscribe_and_listen(ws_url: &str) -> Result<()> {
    let (mut ws_stream, _response) = connect_async(ws_url)
        .await
        .context("failed to connect to Helius WebSocket endpoint")?;

    let subscribe_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "programSubscribe",
        "params": [
            PUMPFUN_PROGRAM_ID,
            {
                "encoding": "base64",
                "commitment": "confirmed"
            }
        ]
    });

    ws_stream
        .send(Message::Text(subscribe_request.to_string()))
        .await
        .context("failed to send programSubscribe request")?;

    let confirmation = ws_stream
        .next()
        .await
        .ok_or_else(|| anyhow!("connection closed before subscription confirmation"))?
        .context("error reading subscription confirmation")?;

    if let Message::Text(text) = &confirmation {
        println!("Subscription confirmation: {text}");
    } else {
        println!("Subscription confirmation (non-text frame): {confirmation:?}");
    }

    let mut count = 0usize;
    while count < TARGET_UPDATES {
        let msg = ws_stream
            .next()
            .await
            .ok_or_else(|| anyhow!("WebSocket stream closed after {count} updates"))?
            .context("error reading notification message")?;

        let text = match msg {
            Message::Text(t) => t,
            Message::Ping(_) | Message::Pong(_) => continue,
            other => {
                println!("Received non-text frame: {other:?}");
                continue;
            }
        };

        let parsed: Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => {
                println!("Non-JSON message: {text}");
                continue;
            }
        };

        if parsed.get("method").and_then(Value::as_str) != Some("programNotification") {
            continue;
        }

        count += 1;
        let slot = parsed
            .pointer("/params/result/context/slot")
            .and_then(Value::as_u64)
            .map(|s| s.to_string())
            .unwrap_or_else(|| "unknown".to_string());
        let pubkey = parsed
            .pointer("/params/result/value/pubkey")
            .and_then(Value::as_str)
            .unwrap_or("unknown");

        println!("Update #{count} | slot: {slot} | account: {pubkey}");
    }

    println!(
        "SUCCESS: WebSocket connection verified. Received {count} account updates from Pump.fun program."
    );

    Ok(())
}
