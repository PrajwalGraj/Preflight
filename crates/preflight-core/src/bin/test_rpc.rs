use anyhow::{anyhow, Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const PUMPFUN_PROGRAM_ID: &str = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const RAYDIUM_AMM_PROGRAM_ID: &str = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

fn main() -> Result<()> {
    if let Err(e) = run() {
        eprintln!("ERROR: {e:#}");
        std::process::exit(1);
    }
    Ok(())
}

fn run() -> Result<()> {
    dotenvy::dotenv().ok();
    let rpc_url =
        std::env::var("HELIUS_RPC_URL").context("HELIUS_RPC_URL not set in environment/.env")?;
    if rpc_url.trim().is_empty() {
        return Err(anyhow!("HELIUS_RPC_URL is empty — set it in .env"));
    }

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    let slot = client.get_slot().context("get_slot failed")?;
    println!("Current slot: {slot}");

    let pubkeys = [JUPITER_PROGRAM_ID, PUMPFUN_PROGRAM_ID, RAYDIUM_AMM_PROGRAM_ID]
        .iter()
        .map(|s| Pubkey::from_str(s).context("invalid pubkey"))
        .collect::<Result<Vec<_>>>()?;

    let fee_records = client
        .get_recent_prioritization_fees(&pubkeys)
        .context("get_recent_prioritization_fees failed")?;

    let mut fees: Vec<u64> = fee_records
        .iter()
        .map(|r| r.prioritization_fee)
        .collect();
    fees.sort_unstable();

    let record_count = fee_records.len();
    println!("Fee records returned: {record_count}");

    if fees.is_empty() {
        println!("No fee records returned — cannot compute statistics.");
        println!("SUCCESS: RPC verified. Slot: {slot}. Fee data: 0 records. Median fee: n/a.");
        return Ok(());
    }

    let nonzero: Vec<u64> = fees.iter().copied().filter(|&f| f > 0).collect();
    let min_fee = nonzero.iter().min().copied().unwrap_or(0);
    let max_fee = fees.iter().max().copied().unwrap_or(0);
    let median_fee = percentile(&fees, 0.50);
    let p75_fee = percentile(&fees, 0.75);

    println!("Minimum fee (excluding 0): {min_fee} micro-lamports");
    println!("Median fee: {median_fee} micro-lamports");
    println!("p75 fee: {p75_fee} micro-lamports");
    println!("Maximum fee: {max_fee} micro-lamports");
    println!("All fees (micro-lamports): {fees:?}");

    println!(
        "SUCCESS: RPC verified. Slot: {slot}. Fee data: {record_count} records. Median fee: {median_fee} micro-lamports."
    );

    Ok(())
}

fn percentile(sorted: &[u64], p: f64) -> u64 {
    if sorted.is_empty() {
        return 0;
    }
    let idx = ((sorted.len() as f64 - 1.0) * p).round() as usize;
    sorted[idx.min(sorted.len() - 1)]
}
