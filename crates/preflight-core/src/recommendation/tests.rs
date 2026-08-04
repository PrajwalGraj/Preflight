use super::decide;
use super::DecideInput;
use crate::types::{Action, AccountContention, ContentionLevel, DataFreshness, SimulationResult};

fn sim_pass() -> SimulationResult {
    SimulationResult {
        success: true,
        error: None,
        compute_units_used: 100_000,
        blockhash_slots_remaining: 100,
        logs: vec![],
    }
}

fn sim_fail(error: &str) -> SimulationResult {
    SimulationResult {
        success: false,
        error: Some(error.to_string()),
        compute_units_used: 0,
        blockhash_slots_remaining: 100,
        logs: vec![],
    }
}

fn fresh() -> DataFreshness {
    DataFreshness {
        last_update_ms: 50,
        is_stale: false,
    }
}

fn stale() -> DataFreshness {
    DataFreshness {
        last_update_ms: 1000,
        is_stale: true,
    }
}

fn account(level: ContentionLevel, tx_per_5s: u64) -> AccountContention {
    AccountContention {
        address: "So11111111111111111111111111111111111111112".to_string(),
        tx_per_1s: 0,
        tx_per_5s,
        tx_per_30s: 0,
        level,
    }
}

fn default_fees() -> (u64, u64, u64) {
    (1_000, 5_000, 25_000)
}

#[test]
fn test_decode_failure_returns_caution() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: true,
    });
    assert_eq!(output.action, Action::Caution);
    assert!(output.reasons[0].contains("decode"));
    assert_eq!(output.reasons.len(), 1); 
}

#[test]
fn test_all_clear_returns_send() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![account(ContentionLevel::Low, 10)],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Send);
    assert!(output.reasons.iter().any(|r| r.contains("Low contention")));
    assert!(output.reasons.iter().any(|r| r.contains("Simulation passed")));
}

#[test]
fn test_high_contention_returns_wait() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![account(ContentionLevel::High, 800)],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Wait);
    assert!(output.reasons.iter().any(|r| r.contains("High contention")));
}

#[test]
fn test_high_contention_overrides_sim_pass() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![
            account(ContentionLevel::High, 600),
            account(ContentionLevel::Low, 5),
        ],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Wait);
}

#[test]
fn test_moderate_contention_returns_caution() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![account(ContentionLevel::Moderate, 200)],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Caution);
    assert!(output
        .reasons
        .iter()
        .any(|r| r.contains("Moderate contention")));
}

#[test]
fn test_sim_failure_returns_caution() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![account(ContentionLevel::Low, 5)],
        simulation: sim_fail("SlippageToleranceExceeded"),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Caution);
    assert!(output
        .reasons
        .iter()
        .any(|r| r.contains("simulation failed")));
}

#[test]
fn test_expired_blockhash_returns_caution() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![account(ContentionLevel::Low, 5)],
        simulation: SimulationResult {
            success: false,
            error: Some("BlockhashNotFound".to_string()),
            compute_units_used: 0,
            blockhash_slots_remaining: 0, // expired
            logs: vec![],
        },
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Caution);
    assert!(output.reasons.iter().any(|r| r.contains("blockhash")));
}

#[test]
fn test_stale_data_returns_caution() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![account(ContentionLevel::Low, 5)],
        simulation: sim_pass(),
        freshness: stale(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Caution);
    assert!(output.reasons.iter().any(|r| r.contains("stale")));
}

#[test]
fn test_fee_scales_with_contention() {
    let fees = (2_000u64, 8_000u64, 30_000u64);

    let low_output = decide(DecideInput {
        contention: vec![account(ContentionLevel::Low, 10)],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: fees.0,
        fee_p75: fees.1,
        fee_p90: fees.2,
        decode_failed: false,
    });

    let high_output = decide(DecideInput {
        contention: vec![account(ContentionLevel::High, 600)],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: fees.0,
        fee_p75: fees.1,
        fee_p90: fees.2,
        decode_failed: false,
    });

    // High contention should recommend higher fee than Low
    assert!(high_output.recommended_priority_fee > low_output.recommended_priority_fee);

    // High → p90
    assert_eq!(high_output.recommended_priority_fee, 30_000);

    // Low → p50
    assert_eq!(low_output.recommended_priority_fee, 2_000);
}

#[test]
fn test_high_contention_reason_includes_count() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![account(ContentionLevel::High, 847)],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    // Reason should mention the tx count (847)
    assert!(output.reasons.iter().any(|r| r.contains("847")));
}

#[test]
fn test_empty_contention_returns_send() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![], // no accounts tracked
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Send);
}

#[test]
fn test_worst_account_level_wins() {
    let (p50, p75, p90) = default_fees();
    let output = decide(DecideInput {
        contention: vec![
            account(ContentionLevel::Low, 10),
            account(ContentionLevel::Low, 20),
            account(ContentionLevel::High, 700),
        ],
        simulation: sim_pass(),
        freshness: fresh(),
        fee_p50: p50,
        fee_p75: p75,
        fee_p90: p90,
        decode_failed: false,
    });
    assert_eq!(output.action, Action::Wait);
}
