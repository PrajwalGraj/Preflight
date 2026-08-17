use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ContentionLevel {
    Low,      
    Moderate, 
    High,     
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountContention {
    pub address: String, 
    pub tx_per_1s: u64,
    pub tx_per_5s: u64,
    pub tx_per_30s: u64,
    pub level: ContentionLevel, 
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResult {
    pub success: bool,
    pub error: Option<String>, 
    pub compute_units_used: u64,
    pub blockhash_slots_remaining: u64, 
    pub logs: Vec<String>,              
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataFreshness {
    pub last_update_ms: u64,
    pub is_stale: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Action {
    Send,    
    Caution, 
    Wait,   
}

/// One historically-failed transaction from a wallet, classified by the
/// same error-string rules the backtest uses.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletFailure {
    pub signature: String,
    pub slot: u64,
    /// Raw error string from the transaction meta, as reported by the RPC.
    pub error: String,
    /// What Preflight would have advised, had it been consulted.
    pub action: Action,
    pub reason: String,
    /// True when the error is a contention-driven race (slippage, curve
    /// completion) — the class of failure Preflight is designed to prevent.
    pub is_contention_error: bool,
    /// Fee actually paid, in lamports.
    pub fee: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletDiagnosis {
    pub wallet: String,
    /// Total signatures inspected (both successful and failed).
    pub transactions_scanned: usize,
    pub failures: Vec<WalletFailure>,
    pub contention_failures: usize,
    /// Total lamports paid for transactions that failed.
    pub lamports_wasted: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub action: Action,
    pub recommended_priority_fee: u64,
    pub reasons: Vec<String>,

    pub contention: Vec<AccountContention>,

    /// Result from the simulation engine
    pub simulation: SimulationResult,
    pub data_freshness: DataFreshness,

    pub analyzed_at_slot: u64,
}
