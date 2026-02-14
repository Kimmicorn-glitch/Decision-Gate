#[path = "../agents/mod.rs"]
mod agents;
#[path = "../api/mod.rs"]
mod api;
#[path = "../governance/mod.rs"]
mod governance;
#[path = "../mcp/mod.rs"]
mod mcp;

use std::{net::SocketAddr, sync::Arc};

use agents::{CriticAgent, ExecutionAgent, GovernanceAgent, PlannerAgent};
use api::{
    AppState, AuditListResponse, CosmosStateStore, DecisionEngine, FoundryModelRouter,
    InMemoryStateStore, ProposedActionRequest, StateStore,
};
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, options, post},
    Json, Router,
};
use governance::PolicyEngine;
use mcp::AzureMcpAdapter;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    api::init_observability()?;

    let policy_engine = PolicyEngine::from_yaml_file("config/policies.yaml")?;
    let model_router = FoundryModelRouter::from_yaml_file("config/model-router.yaml")?;

    let mcp_adapter = Arc::new(AzureMcpAdapter::new(
        std::env::var("MCP_BASE_URL").unwrap_or_else(|_| "http://localhost:7071".to_string()),
        std::env::var("MCP_LOGGING_PATH").unwrap_or_else(|_| "/api/mcp/log-decision".to_string()),
    ));

    let state_store: Arc<dyn StateStore> = match (
        std::env::var("COSMOS_ENDPOINT"),
        std::env::var("COSMOS_DATABASE"),
        std::env::var("COSMOS_CONTAINER"),
        std::env::var("COSMOS_KEY"),
    ) {
        (Ok(endpoint), Ok(database), Ok(container), Ok(key)) => {
            Arc::new(CosmosStateStore::new(endpoint, database, container, key))
        }
        _ => Arc::new(InMemoryStateStore::default()),
    };

    let engine = Arc::new(DecisionEngine::new(
        Arc::new(PlannerAgent::default()),
        Arc::new(ExecutionAgent::default()),
        Arc::new(GovernanceAgent::new(policy_engine.clone())),
        Arc::new(CriticAgent::default()),
        state_store,
        mcp_adapter,
        model_router,
    ));

    let app_state = AppState { engine };
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/proposed-action", post(handle_proposed_action))
        .route("/proposed-action", options(handle_preflight))
        .route("/audit", get(handle_audit_log))
        .route("/audit", options(handle_preflight))
        .with_state(app_state)
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    let addr: SocketAddr = std::env::var("BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
        .parse()?;

    info!(%addr, "agent-decision-gate started");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn handle_proposed_action(
    State(state): State<AppState>,
    Json(payload): Json<ProposedActionRequest>,
) -> impl IntoResponse {
    let response = state.engine.evaluate(payload).await;
    Json(response)
}

async fn handle_audit_log(State(state): State<AppState>) -> impl IntoResponse {
    let data = state.engine.list_audits().await;
    Json(AuditListResponse { data })
}

async fn handle_preflight() -> impl IntoResponse {
    StatusCode::NO_CONTENT
}
