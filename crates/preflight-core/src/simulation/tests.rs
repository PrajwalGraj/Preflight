use super::*;

#[tokio::test]
#[ignore]
async fn test_extract_writable_accounts_real_tx() {
    use solana_client::rpc_config::RpcTransactionConfig;
    use solana_commitment_config::CommitmentConfig;
    use solana_sdk::signature::Signature;
    use solana_transaction_status_client_types::{
        EncodedTransaction, TransactionBinaryEncoding, UiTransactionEncoding,
    };
    use std::str::FromStr;

    dotenvy::dotenv().ok();
    let rpc_url = std::env::var("HELIUS_RPC_URL").expect("HELIUS_RPC_URL not set");

    let data = std::fs::read_to_string("../../scripts/data/jupiter_failed_txs.json")
        .expect("failed to read scripts/data/jupiter_failed_txs.json");
    let txs: serde_json::Value = serde_json::from_str(&data).expect("invalid JSON");
    let signature_str = txs[0]["signature"].as_str().expect("no signature field");

    let signature = Signature::from_str(signature_str).expect("invalid signature string");

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Base64),
        commitment: Some(CommitmentConfig::confirmed()),
        max_supported_transaction_version: Some(0),
    };

    let confirmed_tx = client
        .get_transaction_with_config(&signature, config)
        .expect("get_transaction_with_config failed");

    let tx_base64 = match confirmed_tx.transaction.transaction {
        EncodedTransaction::Binary(blob, TransactionBinaryEncoding::Base64) => blob,
        other => panic!("expected base64-encoded transaction, got {other:?}"),
    };

    let engine = SimulationEngine::new("https://mainnet.helius-rpc.com");
    let writable = engine
        .extract_writable_accounts(&tx_base64)
        .expect("failed to extract writable accounts");

    assert!(!writable.is_empty());
}

#[test]
fn test_invalid_base64_returns_error() {
    let engine = SimulationEngine::new("https://example.com");
    let result = engine.extract_writable_accounts("not_valid_base64!!!");
    assert!(result.is_err());
}


#[tokio::test]
async fn test_simulation_error_returns_safe_defaults() {
    let engine = SimulationEngine::new("https://example.com");
    let result = engine.simulate("invalid_base64").await;

    assert!(!result.success);
    assert_eq!(result.compute_units_used, 0);
    assert_eq!(result.blockhash_slots_remaining, 0);
    assert!(result.error.is_some());
}
