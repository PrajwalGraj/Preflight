#[cfg(test)]
mod tests;

use crate::contention::{ContentionEngine, PROGRAMS};
use crate::simulation::SimulationEngine;
use crate::types::{
    Action, AccountContention, ContentionLevel, DataFreshness, Recommendation, SimulationResult,
    WalletDiagnosis, WalletFailure,
};
use solana_client::rpc_client::GetConfirmedSignaturesForAddress2Config;
use solana_client::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use std::sync::Arc;

const DEFAULT_FEE_P50: u64 = 1_000;
const DEFAULT_FEE_P75: u64 = 5_000;
const DEFAULT_FEE_P90: u64 = 25_000;
const MIN_PRIORITY_FEE: u64 = 1_000;
const DECODE_FAILURE_FEE: u64 = 50_000;
const MAX_FEE_LOOKUP_ACCOUNTS: usize = 5;

pub struct DecideInput {
    pub contention: Vec<AccountContention>,

    pub simulation: SimulationResult,

    pub freshness: DataFreshness,

    pub fee_p50: u64,
    pub fee_p75: u64,
    pub fee_p90: u64,

    pub decode_failed: bool,
}

pub struct DecideOutput {
    pub action: Action,
    pub reasons: Vec<String>,
    pub recommended_priority_fee: u64,
}

pub fn decide(input: DecideInput) -> DecideOutput {
    let mut action: Option<Action> = None;
    let mut reasons: Vec<String> = Vec::new();

    // --- Rule 0: Decode failure ---
    // If the transaction could not be decoded at all, return immediately.
    // Do not check any other rules.
    if input.decode_failed {
        return DecideOutput {
            action: Action::Caution,
            reasons: vec![
                "Could not decode transaction — verify it is a valid base64-encoded Solana transaction."
                    .to_string(),
            ],
            recommended_priority_fee: DECODE_FAILURE_FEE,
        };
    }

    // --- Rule 1: Stale data ---
    // Stale data does not set the action, but always adds a reason.
    if input.freshness.is_stale {
        reasons.push(
            "Network data is momentarily stale — recommendation is based on simulation only."
                .to_string(),
        );
        if action.is_none() {
            action = Some(Action::Caution);
        }
    }

    // --- Rule 2: Blockhash expired ---
    if input.simulation.blockhash_slots_remaining == 0 {
        reasons.push(
            "Transaction blockhash has expired — rebuild the transaction with a fresh blockhash before sending."
                .to_string(),
        );
        if action.is_none() {
            action = Some(Action::Caution);
        }
    }

    // --- Rule 3: Simulation failed ---
    // Only fires if blockhash is NOT expired (blockhash expiry is
    // the more specific reason when both are true)
    if !input.simulation.success && input.simulation.blockhash_slots_remaining > 0 {
        let error_msg = input.simulation.error.as_deref().unwrap_or("unknown error");
        reasons.push(format!(
            "Transaction simulation failed: {error_msg} — check instruction data and account balances."
        ));
        if action.is_none() {
            action = Some(Action::Caution);
        }
    }

    // --- Rule 4: High contention ---
    // Find the account with highest tx_per_5s among High-level accounts
    let high_accounts: Vec<&AccountContention> = input
        .contention
        .iter()
        .filter(|a| a.level == ContentionLevel::High)
        .collect();

    if !high_accounts.is_empty() {
        let busiest = high_accounts.iter().max_by_key(|a| a.tx_per_5s).unwrap();
        let short_addr = &busiest.address[..8.min(busiest.address.len())];

        reasons.push(format!(
            "High contention on account {}... — {} competing transactions in the last 5 seconds.",
            short_addr, busiest.tx_per_5s
        ));
        // Wait overrides any previously set action
        action = Some(Action::Wait);
    }

    // --- Rule 5: Moderate contention ---
    // Only fires if action not already Wait
    let moderate_accounts: Vec<&AccountContention> = input
        .contention
        .iter()
        .filter(|a| a.level == ContentionLevel::Moderate)
        .collect();

    if !moderate_accounts.is_empty() && action != Some(Action::Wait) {
        let busiest = moderate_accounts.iter().max_by_key(|a| a.tx_per_5s).unwrap();
        let short_addr = &busiest.address[..8.min(busiest.address.len())];

        reasons.push(format!(
            "Moderate contention on account {short_addr}... — increasing priority fee to p75 improves landing probability."
        ));
        if action.is_none() {
            action = Some(Action::Caution);
        }
    }

    // --- Rule 6: All clear ---
    // Only fires if no action set yet AND simulation passed
    if action.is_none() && input.simulation.success {
        reasons.push("Low contention on all accounts.".to_string());
        reasons.push("Simulation passed — transaction logic is valid.".to_string());
        action = Some(Action::Send);
    }

    // --- Rule 7: Fallback ---
    // Should rarely fire — covers edge cases like
    // simulation not run + no contention data
    if action.is_none() {
        reasons
            .push("Unable to fully assess network conditions — proceed with caution.".to_string());
        action = Some(Action::Caution);
    }

    // --- Fee recommendation ---
    // Scale with the highest contention level found
    let highest_level = input
        .contention
        .iter()
        .map(|a| &a.level)
        .max_by_key(|l| match l {
            ContentionLevel::High => 2,
            ContentionLevel::Moderate => 1,
            ContentionLevel::Low => 0,
        })
        .cloned()
        .unwrap_or(ContentionLevel::Low);

    let recommended_priority_fee = match highest_level {
        ContentionLevel::High => input.fee_p90.max(MIN_PRIORITY_FEE),
        ContentionLevel::Moderate => input.fee_p75.max(MIN_PRIORITY_FEE),
        ContentionLevel::Low => input.fee_p50.max(MIN_PRIORITY_FEE),
    };

    DecideOutput {
        action: action.unwrap_or(Action::Caution),
        reasons,
        recommended_priority_fee,
    }
}

/// How many recent signatures to page through when looking for failures.
const WALLET_SCAN_DEPTH: usize = 100;
/// Fee at or below which a failure is also attributable to underpaying.
const LOW_FEE_LAMPORTS: u64 = 5_000;

/// Classify a historical transaction failure from its error string.
///
/// This deliberately mirrors the error-string rules in `scripts/backtest.ts`
/// rather than calling `decide()`. `decide()` reasons over *live* contention
/// counters and a fresh simulation, neither of which exists for a transaction
/// that already failed on-chain — feeding it a synthetic input would collapse
/// every historical failure to a generic "simulation failed" and destroy the
/// contention/non-contention split that makes this diagnosis useful.
pub fn classify_failure(error: &str, fee: u64) -> (Action, String, bool) {
    let e = error.to_lowercase();

    // Jupiter 6001 = SlippageToleranceExceeded — price moved because
    // another transaction landed first.
    let is_slippage = e.contains("\"custom\":6001")
        || e.contains("\"custom\": 6001")
        || e.contains("6001");

    // Pump.fun 7 = BondingCurveComplete, 412 = SlippageExceeded.
    let is_pump_contention = e.contains("\"custom\":7")
        || e.contains("\"custom\": 7")
        || e.contains("\"custom\":412")
        || e.contains("\"custom\": 412");

    let is_expired_blockhash =
        e.contains("blockhashnotfound") || e.contains("blockhash not found");

    let is_low_fee = fee <= LOW_FEE_LAMPORTS;

    if is_slippage || is_pump_contention {
        let reason = if is_slippage {
            "SlippageToleranceExceeded — contention likely caused the price to move before this landed."
        } else {
            "Bonding curve race — another transaction reached the curve first."
        };
        return (Action::Wait, reason.to_string(), true);
    }

    if is_expired_blockhash {
        return (
            Action::Caution,
            "Blockhash expired — the transaction was too old by the time it was submitted."
                .to_string(),
            false,
        );
    }

    if is_low_fee {
        return (
            Action::Caution,
            format!("Priority fee of {fee} lamports was likely too low to land under load."),
            false,
        );
    }

    (
        Action::Caution,
        "Failed for a non-contention reason — simulation would likely have caught this."
            .to_string(),
        false,
    )
}

pub struct RecommendationEngine {
    contention: Arc<ContentionEngine>,
    simulation: Arc<SimulationEngine>,
    rpc: Arc<RpcClient>,
}

impl RecommendationEngine {
    pub fn new(
        contention: Arc<ContentionEngine>,
        simulation: Arc<SimulationEngine>,
        rpc_url: &str,
    ) -> Self {
        Self {
            contention,
            simulation,
            rpc: Arc::new(RpcClient::new_with_commitment(
                rpc_url.to_string(),
                CommitmentConfig::confirmed(),
            )),
        }
    }

    /// Analyze a base64-encoded transaction.
    /// Never panics. Never returns Err.
    pub async fn analyze(&self, tx_base64: &str) -> Recommendation {
        // Step 1: Extract writable accounts
        let writable_accounts = match self.simulation.extract_writable_accounts(tx_base64) {
            Ok(accounts) => accounts,
            Err(_) => {
                let decode_failed_sim = SimulationResult {
                    success: false,
                    error: Some("Transaction decode failed".to_string()),
                    compute_units_used: 0,
                    blockhash_slots_remaining: 0,
                    logs: vec![],
                };
                let output = decide(DecideInput {
                    contention: vec![],
                    simulation: decode_failed_sim.clone(),
                    freshness: self.contention.freshness(),
                    fee_p50: DEFAULT_FEE_P50,
                    fee_p75: DEFAULT_FEE_P75,
                    fee_p90: DEFAULT_FEE_P90,
                    decode_failed: true,
                });
                return self.build_recommendation(output, vec![], decode_failed_sim);
            }
        };

        // Step 2 + 3: simulation is async, contention query is sync —
        // kick off the simulation future, run the (cheap, in-memory)
        // contention query, then await the simulation.
        let sim_future = self.simulation.simulate(tx_base64);
        let contention_data = self.contention.query(&writable_accounts);
        let sim_result = sim_future.await;

        // Step 4: Fetch fee data
        let (fee_p50, fee_p75, fee_p90) = self.fetch_fee_percentiles(&writable_accounts).await;

        // Step 5: Call pure decide() function
        let output = decide(DecideInput {
            contention: contention_data.clone(),
            simulation: sim_result.clone(),
            freshness: self.contention.freshness(),
            fee_p50,
            fee_p75,
            fee_p90,
            decode_failed: false,
        });

        self.build_recommendation(output, contention_data, sim_result)
    }

    /// Fetch priority fee percentiles for a set of accounts.
    /// Returns (p50, p75, p90) in micro-lamports.
    /// Returns defaults if the RPC call fails or returns no non-zero fees.
    async fn fetch_fee_percentiles(&self, accounts: &[String]) -> (u64, u64, u64) {
        let pubkeys: Vec<Pubkey> = accounts
            .iter()
            .filter_map(|a| Pubkey::from_str(a).ok())
            .take(MAX_FEE_LOOKUP_ACCOUNTS)
            .collect();

        if pubkeys.is_empty() {
            return (DEFAULT_FEE_P50, DEFAULT_FEE_P75, DEFAULT_FEE_P90);
        }

        let rpc = self.rpc.clone();
        let result =
            tokio::task::spawn_blocking(move || rpc.get_recent_prioritization_fees(&pubkeys))
                .await;

        match result {
            Ok(Ok(fees)) => {
                let mut non_zero: Vec<u64> = fees
                    .iter()
                    .map(|f| f.prioritization_fee)
                    .filter(|&f| f > 0)
                    .collect();

                if non_zero.is_empty() {
                    return (DEFAULT_FEE_P50, DEFAULT_FEE_P75, DEFAULT_FEE_P90);
                }

                non_zero.sort_unstable();
                let len = non_zero.len();

                let p50 = non_zero[len / 2];
                let p75 = non_zero[(len * 3) / 4];
                let p90 = non_zero[(len * 9) / 10];

                (
                    p50.max(MIN_PRIORITY_FEE),
                    p75.max(MIN_PRIORITY_FEE),
                    p90.max(MIN_PRIORITY_FEE),
                )
            }
            _ => (DEFAULT_FEE_P50, DEFAULT_FEE_P75, DEFAULT_FEE_P90),
        }
    }

    /// Inspect a wallet's recent history and classify its failed transactions.
    ///
    /// Reads at most [`WALLET_SCAN_DEPTH`] recent signatures in one RPC call,
    /// then fetches full details only for the failures (capped at `limit`) so
    /// the cost stays bounded regardless of how busy the wallet is.
    ///
    /// Never panics. Returns an empty diagnosis rather than an error when the
    /// address is unparseable or the RPC is unreachable.
    pub async fn diagnose_wallet(&self, wallet: &str, limit: usize) -> WalletDiagnosis {
        let empty = |scanned: usize| WalletDiagnosis {
            wallet: wallet.to_string(),
            transactions_scanned: scanned,
            failures: vec![],
            contention_failures: 0,
            lamports_wasted: 0,
        };

        let Ok(pubkey) = Pubkey::from_str(wallet) else {
            return empty(0);
        };

        let rpc = self.rpc.clone();
        let sigs = tokio::task::spawn_blocking(move || {
            rpc.get_signatures_for_address_with_config(
                &pubkey,
                GetConfirmedSignaturesForAddress2Config {
                    limit: Some(WALLET_SCAN_DEPTH),
                    commitment: Some(CommitmentConfig::confirmed()),
                    ..Default::default()
                },
            )
        })
        .await;

        let sigs = match sigs {
            Ok(Ok(s)) => s,
            _ => return empty(0),
        };

        let scanned = sigs.len();

        // The signature listing already carries the error, so failures are
        // identified without any per-transaction lookup.
        let failed: Vec<_> = sigs
            .into_iter()
            .filter(|s| s.err.is_some())
            .take(limit)
            .collect();

        let mut failures = Vec::new();

        for entry in failed {
            let error = entry
                .err
                .as_ref()
                .map(|e| format!("{e:?}"))
                .unwrap_or_default();

            // Fee requires the full transaction; fall back to 0 (which reads
            // as "unknown", not "free") if the lookup fails.
            let fee = self.fetch_transaction_fee(&entry.signature).await;

            let (action, reason, is_contention_error) = classify_failure(&error, fee);

            failures.push(WalletFailure {
                signature: entry.signature,
                slot: entry.slot,
                error,
                action,
                reason,
                is_contention_error,
                fee,
            });
        }

        let contention_failures = failures.iter().filter(|f| f.is_contention_error).count();
        let lamports_wasted = failures.iter().map(|f| f.fee).sum();

        WalletDiagnosis {
            wallet: wallet.to_string(),
            transactions_scanned: scanned,
            failures,
            contention_failures,
            lamports_wasted,
        }
    }

    /// Fee paid by a single transaction, in lamports. Returns 0 when unknown.
    async fn fetch_transaction_fee(&self, signature: &str) -> u64 {
        use solana_transaction_status_client_types::UiTransactionEncoding;

        let Ok(sig) = solana_sdk::signature::Signature::from_str(signature) else {
            return 0;
        };

        let rpc = self.rpc.clone();
        let result = tokio::task::spawn_blocking(move || {
            rpc.get_transaction_with_config(
                &sig,
                solana_client::rpc_config::RpcTransactionConfig {
                    encoding: Some(UiTransactionEncoding::Base64),
                    commitment: Some(CommitmentConfig::confirmed()),
                    max_supported_transaction_version: Some(0),
                },
            )
        })
        .await;

        match result {
            Ok(Ok(tx)) => tx.transaction.meta.map(|m| m.fee).unwrap_or(0),
            _ => 0,
        }
    }

    /// Returns contention level for all 8 watched programs.
    pub fn program_status(&self) -> Vec<(String, ContentionLevel)> {
        PROGRAMS
            .iter()
            .map(|(name, _)| {
                let level = self
                    .contention
                    .program_level(name)
                    .unwrap_or(ContentionLevel::Low);
                (name.to_string(), level)
            })
            .collect()
    }

    /// Helper: build a Recommendation from DecideOutput.
    fn build_recommendation(
        &self,
        output: DecideOutput,
        contention: Vec<AccountContention>,
        simulation: SimulationResult,
    ) -> Recommendation {
        let slot = self.rpc.get_slot().unwrap_or(0);

        Recommendation {
            action: output.action,
            recommended_priority_fee: output.recommended_priority_fee,
            reasons: output.reasons,
            contention,
            simulation,
            data_freshness: self.contention.freshness(),
            analyzed_at_slot: slot,
        }
    }
}
