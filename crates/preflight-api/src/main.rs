mod chat;
mod lana;
mod rate_limit;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use lana::LanaClient;
use preflight_core::{
    ContentionEngine, ContentionLevel, Recommendation, RecommendationEngine, SimulationEngine,
};
use rate_limit::RateLimiter;
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    engine: Arc<RecommendationEngine>,
    contention: Arc<ContentionEngine>,
    /// None when LANA_KEY is unset — the chat route then returns a clear
    /// "not configured" instead of the server refusing to boot.
    lana: Option<LanaClient>,
    rate_limiter: Arc<RateLimiter>,
}


#[derive(Deserialize)]
struct AnalyzeRequest {
    transaction: String,
}

#[derive(Serialize)]
struct ProgramStatusEntry {
    name: String,
    level: String, 
}

#[derive(Serialize)]
struct StatusResponse {
    network: String,
    programs: Vec<ProgramStatusEntry>,
    data_freshness_ms: u64,
    updated_at: String,
}

#[derive(Serialize)]
struct ProgramResponse {
    program: String,
    level: String,
    data_freshness_ms: u64,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Load .env file
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("preflight_api=info".parse()?)
                .add_directive("preflight_core=info".parse()?),
        )
        .init();

    let rpc_url =
        std::env::var("HELIUS_RPC_URL").expect("HELIUS_RPC_URL must be set in .env");
    let ws_url = std::env::var("HELIUS_WS_URL").expect("HELIUS_WS_URL must be set in .env");
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());

    // Lana is optional: without a key the rest of the API still works and only
    // /v1/chat degrades, which beats refusing to start the whole service.
    let lana_host = std::env::var("LANA_HOST")
        .unwrap_or_else(|_| "https://lana-api.helius-experiments.com".to_string());
    let lana = match std::env::var("LANA_KEY") {
        Ok(key) if !key.trim().is_empty() && !key.contains("REPLACE_ME") => {
            tracing::info!("Lana client configured — host {lana_host}");
            Some(LanaClient::new(lana_host, key))
        }
        _ => {
            tracing::warn!("LANA_KEY not set — /v1/chat will report as unconfigured");
            None
        }
    };

    tracing::info!("Starting ContentionEngine...");
    let contention = Arc::new(ContentionEngine::new(ws_url));
    contention.start().await?;
    tracing::info!("ContentionEngine started — subscribing to 8 programs");

    tracing::info!("Waiting 3s for initial contention data...");
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

    let simulation = Arc::new(SimulationEngine::new(&rpc_url));
    let engine = Arc::new(RecommendationEngine::new(
        Arc::clone(&contention),
        Arc::clone(&simulation),
        &rpc_url,
    ));
    tracing::info!("RecommendationEngine ready");

    {
        let contention_bg = Arc::clone(&contention);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
            loop {
                interval.tick().await;
                contention_bg.cleanup_old_timestamps();
            }
        });
    }
    tracing::info!("Background cleanup task spawned");

    let state = AppState {
        engine,
        contention,
        lana,
        rate_limiter: Arc::new(RateLimiter::new()),
    };
    let app = build_router(state);

    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Preflight API listening on http://{addr}");
    // ConnectInfo is required so the chat rate limiter can see the peer IP.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/v1/analyze", post(analyze_handler))
        .route("/v1/status", get(status_handler))
        .route("/v1/program/{name}", get(program_handler))
        .route("/v1/chat", post(chat::chat_handler))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state)
}

async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "preflight-api".to_string(),
    })
}

async fn analyze_handler(
    State(state): State<AppState>,
    Json(req): Json<AnalyzeRequest>,
) -> Json<Recommendation> {
    let recommendation = state.engine.analyze(&req.transaction).await;
    Json(recommendation)
}

async fn status_handler(State(state): State<AppState>) -> Json<StatusResponse> {
    let program_statuses = state.engine.program_status();

    let has_high = program_statuses
        .iter()
        .any(|(_, l)| *l == ContentionLevel::High);
    let has_moderate = program_statuses
        .iter()
        .any(|(_, l)| *l == ContentionLevel::Moderate);

    let network = if has_high {
        "congested".to_string()
    } else if has_moderate {
        "moderate".to_string()
    } else {
        "healthy".to_string()
    };

    let programs = program_statuses
        .into_iter()
        .map(|(name, level)| ProgramStatusEntry {
            name,
            level: format!("{level:?}"),
        })
        .collect();

    let freshness = state.contention.freshness();
    let updated_at = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    Json(StatusResponse {
        network,
        programs,
        data_freshness_ms: freshness.last_update_ms,
        updated_at,
    })
}

async fn program_handler(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<ProgramResponse>, (StatusCode, String)> {
    let valid_names = [
        "jupiter",
        "pumpfun",
        "raydium_amm",
        "raydium_clmm",
        "orca",
        "marinade",
        "tensor",
        "magic_eden",
    ];

    if !valid_names.contains(&name.as_str()) {
        return Err((
            StatusCode::NOT_FOUND,
            format!(
                "Unknown program '{}'. Valid names: {}",
                name,
                valid_names.join(", ")
            ),
        ));
    }

    let all_statuses = state.engine.program_status();
    let level = all_statuses
        .into_iter()
        .find(|(n, _)| n == &name)
        .map(|(_, l)| format!("{l:?}"))
        .unwrap_or_else(|| "Low".to_string());

    let freshness = state.contention.freshness();

    Ok(Json(ProgramResponse {
        program: name,
        level,
        data_freshness_ms: freshness.last_update_ms,
    }))
}
