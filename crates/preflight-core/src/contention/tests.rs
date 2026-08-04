use super::*;
use std::sync::atomic::Ordering;
use std::time::{Duration, Instant};

fn ago(ms: u64) -> Instant {
    Instant::now() - Duration::from_millis(ms)
}

#[test]
fn test_contention_level_derivation() {
    assert_eq!(level_from_tx_per_5s(10), ContentionLevel::Low);
    assert_eq!(level_from_tx_per_5s(100), ContentionLevel::Moderate);
    assert_eq!(level_from_tx_per_5s(600), ContentionLevel::High);
}

#[test]
fn test_unknown_account_returns_low() {
    let engine = ContentionEngine::new("wss://dummy.example".to_string());
    let results = engine.query(&["UnknownPubkey111".to_string()]);

    assert_eq!(results.len(), 1);
    let r = &results[0];
    assert_eq!(r.level, ContentionLevel::Low);
    assert_eq!(r.tx_per_1s, 0);
    assert_eq!(r.tx_per_5s, 0);
    assert_eq!(r.tx_per_30s, 0);
}

#[test]
fn test_window_counting() {
    let engine = ContentionEngine::new("wss://dummy.example".to_string());
    let addr = "TestAccount111".to_string();

    {
        let mut entry = engine.timestamps.entry(addr.clone()).or_default();
        for ms in [100, 200, 300, 400, 500] {
            entry.push(ago(ms));
        }
        for i in 0..15u64 {
            entry.push(ago(1100 + i * 250));
        }
        for i in 0..30u64 {
            entry.push(ago(5100 + i * 700));
        }
    }

    let results = engine.query(&[addr]);
    let r = &results[0];
    assert_eq!(r.tx_per_1s, 5);
    assert_eq!(r.tx_per_5s, 20);
    assert_eq!(r.tx_per_30s, 50);
}

#[test]
fn test_cleanup_removes_old_timestamps() {
    let engine = ContentionEngine::new("wss://dummy.example".to_string());
    let addr = "CleanupAccount111".to_string();

    {
        let mut entry = engine.timestamps.entry(addr.clone()).or_default();
        for ms in [1000, 2000, 3000, 4000, 5000] {
            entry.push(ago(ms));
        }
        for ms in [31000, 32000, 33000, 34000, 35000] {
            entry.push(ago(ms));
        }
    }

    engine.cleanup_old_timestamps();

    let results = engine.query(&[addr]);
    assert_eq!(results[0].tx_per_30s, 5);
}

#[test]
fn test_freshness_detection() {
    let engine = ContentionEngine::new("wss://dummy.example".to_string());

    let now_ms = current_unix_ms();
    engine
        .last_notification
        .store(now_ms.saturating_sub(1000), Ordering::Relaxed);
    assert!(engine.freshness().is_stale);

    let now_ms = current_unix_ms();
    engine
        .last_notification
        .store(now_ms.saturating_sub(100), Ordering::Relaxed);
    assert!(!engine.freshness().is_stale);
}
