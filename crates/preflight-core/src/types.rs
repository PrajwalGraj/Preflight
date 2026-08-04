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
