#[cfg(test)]
mod tests;

use crate::types::SimulationResult;
use anyhow::{Context, Result};
use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSimulateTransactionConfig;
use solana_commitment_config::CommitmentConfig;
use solana_message::VersionedMessage;
use solana_transaction::versioned::VersionedTransaction;
use std::sync::Arc;

const EXPIRED_BLOCKHASH_SLOTS_REMAINING: u64 = 0;
const VALID_BLOCKHASH_SLOTS_REMAINING: u64 = 150;
const APPROX_VALID_BLOCKHASH_SLOTS_REMAINING: u64 = 75;

pub struct SimulationEngine {
    client: Arc<RpcClient>,
}

impl SimulationEngine {
    pub fn new(rpc_url: &str) -> Self {
        Self {
            client: Arc::new(RpcClient::new_with_commitment(
                rpc_url.to_string(),
                CommitmentConfig::confirmed(),
            )),
        }
    }

    pub async fn simulate(&self, tx_base64: &str) -> SimulationResult {
        match self.simulate_inner(tx_base64).await {
            Ok(result) => result,
            Err(e) => SimulationResult {
                success: false,
                error: Some(format!("{e:#}")),
                compute_units_used: 0,
                blockhash_slots_remaining: 0,
                logs: vec![],
            },
        }
    }

    async fn simulate_inner(&self, tx_base64: &str) -> Result<SimulationResult> {
        let tx = decode_transaction(tx_base64)?;

        let config = RpcSimulateTransactionConfig {
            sig_verify: false,
            replace_recent_blockhash: false,
            commitment: Some(CommitmentConfig::confirmed()),
            encoding: None,
            accounts: None,
            min_context_slot: None,
            inner_instructions: false,
        };

        let client = self.client.clone();
        let sim_tx = tx.clone();
        let response = tokio::task::spawn_blocking(move || {
            client.simulate_transaction_with_config(&sim_tx, config)
        })
        .await
        .context("simulate_transaction task panicked")?
        .context("simulateTransaction RPC call failed")?;

        let value = response.value;
        let success = value.err.is_none();
        let error = value.err.map(|e| format!("{e:?}"));
        let compute_units_used = value.units_consumed.unwrap_or(0);
        let logs: Vec<String> = value.logs.unwrap_or_default().into_iter().take(10).collect();

        let blockhash_slots_remaining = self.estimate_blockhash_slots_remaining(&tx).await;

        Ok(SimulationResult {
            success,
            error,
            compute_units_used,
            blockhash_slots_remaining,
            logs,
        })
    }

    async fn estimate_blockhash_slots_remaining(&self, tx: &VersionedTransaction) -> u64 {
        let recent_blockhash = *tx.message.recent_blockhash();
        let client = self.client.clone();

        let latest = tokio::task::spawn_blocking(move || client.get_latest_blockhash()).await;

        let latest = match latest {
            Ok(Ok(hash)) => hash,
            _ => return EXPIRED_BLOCKHASH_SLOTS_REMAINING,
        };

        if latest == recent_blockhash {
            return VALID_BLOCKHASH_SLOTS_REMAINING;
        }

        let client = self.client.clone();
        let message = tx.message.clone();
        let fee_result = tokio::task::spawn_blocking(move || match &message {
            VersionedMessage::Legacy(msg) => client.get_fee_for_message(msg),
            VersionedMessage::V0(msg) => client.get_fee_for_message(msg),
        })
        .await;

        match fee_result {
            Ok(Ok(_fee)) => APPROX_VALID_BLOCKHASH_SLOTS_REMAINING,
            _ => EXPIRED_BLOCKHASH_SLOTS_REMAINING,
        }
    }

    pub fn extract_writable_accounts(&self, tx_base64: &str) -> Result<Vec<String>> {
        let tx = decode_transaction(tx_base64)?;
        let message = &tx.message;
        let account_keys = message.static_account_keys();

        let writable = account_keys
            .iter()
            .enumerate()
            .filter(|(idx, _)| message.is_maybe_writable(*idx, None))
            .map(|(_, key)| key.to_string())
            .collect();

        Ok(writable)
    }
}

fn decode_transaction(tx_base64: &str) -> Result<VersionedTransaction> {
    let bytes = STANDARD
        .decode(tx_base64)
        .context("invalid base64 transaction")?;
    let tx: VersionedTransaction =
        bincode::deserialize(&bytes).context("failed to deserialize transaction")?;
    Ok(tx)
}
