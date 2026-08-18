//! Per-IP request cap for `/v1/chat`.
//!
//! TEMPORARY SAFETY NET — not the primary control.
//!
//! Lana allows 100 requests/hour for the whole deployment. This caps any one
//! IP at a fraction of that so a single session cannot exhaust the budget by
//! accident. It is deliberately weak: state is in-memory (so it resets on
//! restart and is per-instance, not shared), and a caller behind a rotating
//! address or a shared NAT defeats or is unfairly caught by it. Replace with
//! a real quota keyed on an authenticated identity before this matters.

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const MAX_REQUESTS_PER_WINDOW: u32 = 20;
const WINDOW: Duration = Duration::from_secs(60 * 60);

pub struct RateLimiter {
    entries: Mutex<HashMap<IpAddr, (u32, Instant)>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    /// Record a request from `ip`. Returns false when the caller is over cap.
    pub fn check(&self, ip: IpAddr) -> bool {
        let now = Instant::now();
        let mut entries = match self.entries.lock() {
            Ok(guard) => guard,
            // A poisoned lock means another thread panicked mid-update. Failing
            // open is the right call: this is a safety net, and refusing every
            // request afterwards would be a worse outage than briefly not
            // counting.
            Err(poisoned) => poisoned.into_inner(),
        };

        // Opportunistically drop windows that have aged out, so the map does
        // not grow without bound across long uptimes.
        entries.retain(|_, (_, started)| now.duration_since(*started) < WINDOW);

        let (count, started) = entries.entry(ip).or_insert((0, now));

        if now.duration_since(*started) >= WINDOW {
            *count = 0;
            *started = now;
        }

        if *count >= MAX_REQUESTS_PER_WINDOW {
            return false;
        }

        *count += 1;
        true
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ip(n: u8) -> IpAddr {
        IpAddr::from([127, 0, 0, n])
    }

    #[test]
    fn allows_up_to_the_cap_then_refuses() {
        let limiter = RateLimiter::new();
        for _ in 0..MAX_REQUESTS_PER_WINDOW {
            assert!(limiter.check(ip(1)));
        }
        assert!(!limiter.check(ip(1)), "should refuse past the cap");
    }

    #[test]
    fn tracks_addresses_independently() {
        let limiter = RateLimiter::new();
        for _ in 0..MAX_REQUESTS_PER_WINDOW {
            assert!(limiter.check(ip(1)));
        }
        assert!(limiter.check(ip(2)), "a different IP has its own budget");
    }
}
