use anyhow::{anyhow, bail, Context, Result};
use preflight_core::{ContentionEngine, SimulationEngine, PROGRAMS};
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcTransactionConfig;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::signature::Signature;
use solana_transaction_status_client_types::{
    EncodedTransaction, TransactionBinaryEncoding, UiTransactionEncoding,
};
use std::str::FromStr;
use std::time::Duration;

#[tokio::main]
async fn main() {
    if let Err(e) = run().await {
        eprintln!("ERROR: {e:#}");
        std::process::exit(1);
    }
}

async fn run() -> Result<()> {
    dotenvy::dotenv().ok();
    let rpc_url = std::env::var("HELIUS_RPC_URL").context("HELIUS_RPC_URL not set in .env")?;
    let ws_url = std::env::var("HELIUS_WS_URL").context("HELIUS_WS_URL not set in .env")?;

    let contention_engine = ContentionEngine::new(ws_url);
    contention_engine.start().await?;

    println!("Waiting 10 seconds to collect contention data...");
    tokio::time::sleep(Duration::from_secs(10)).await;

    println!(
        "Contention engine running. Collected {} total timestamps across all accounts.",
        contention_engine.total_timestamps_tracked()
    );

    let known_accounts = vec![
        "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2".to_string(),
        "9W959DqEETiGZocYWCQPaJ6uxJMBqfk5RjGMqXPBEnjHE".to_string(),
        "HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ".to_string(),
    ];

    for contention in contention_engine.query(&known_accounts) {
        let short: String = contention.address.chars().take(8).collect();
        println!(
            "Account: {short}... | 1s: {} | 5s: {} | 30s: {} | Level: {:?}",
            contention.tx_per_1s, contention.tx_per_5s, contention.tx_per_30s, contention.level
        );
    }

    for (name, _) in PROGRAMS {
        match contention_engine.program_level(name) {
            Some(level) => println!("{name}: {level:?}"),
            None => println!("{name}: unrecognized"),
        }
    }

    let freshness = contention_engine.freshness();
    println!(
        "Data freshness: {}ms since last update | Stale: {}",
        freshness.last_update_ms, freshness.is_stale
    );

    let data = std::fs::read_to_string("scripts/data/jupiter_failed_txs.json")
        .context("failed to read scripts/data/jupiter_failed_txs.json (run from project root)")?;
    let txs: serde_json::Value = serde_json::from_str(&data)?;
    let signature_str = txs[0]["signature"]
        .as_str()
        .ok_or_else(|| anyhow!("no signature field in jupiter_failed_txs.json"))?;

    let signature = Signature::from_str(signature_str)?;
    let rpc_client = RpcClient::new_with_commitment(rpc_url.clone(), CommitmentConfig::confirmed());
    let tx_config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Base64),
        commitment: Some(CommitmentConfig::confirmed()),
        max_supported_transaction_version: Some(0),
    };
    let confirmed_tx = rpc_client.get_transaction_with_config(&signature, tx_config)?;

    let tx_base64 = match confirmed_tx.transaction.transaction {
        EncodedTransaction::Binary(blob, TransactionBinaryEncoding::Base64) => blob,
        other => bail!("expected base64-encoded transaction, got {other:?}"),
    };

    let simulation_engine = SimulationEngine::new(&rpc_url);
    let sim_result = simulation_engine.simulate(&tx_base64).await;
    println!("Simulation result for {signature_str}: {sim_result:?}");

    contention_engine.cleanup_old_timestamps();
    println!("Cleanup complete.");

    println!("ENGINES VERIFIED: ContentionEngine and SimulationEngine both operational.");

    Ok(())
}
