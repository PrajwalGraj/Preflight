#[cfg(test)]
mod tests;

use crate::contention::{ContentionEngine, PROGRAMS};
use crate::simulation::SimulationEngine;
use crate::types::{
    Action, AccountContention, ContentionLevel, DataFreshness, Recommendation, SimulationResult,
};
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
