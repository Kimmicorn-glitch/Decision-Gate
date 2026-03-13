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
    capture_runtime_pressure, AdminError, AdminService, AppState, AuditListResponse,
    ChangePasswordRequest, CosmosStateStore, DecisionEngine, FoundryModelRouter,
    InMemoryStateStore, IntegrationRegistrationRequest, IntegrationRegistryResponse, LoginRequest,
    MonitorRegistry, ProposedActionRequest, RegisterRequest, ResetPasswordConfirmRequest,
    ResetPasswordRequest, RuntimeMetrics, StateStore, UpdateSettingsRequest,
};
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, options, post},
    Json, Router,
};
use chrono::Utc;
use governance::PolicyEngine;
use mcp::AzureMcpAdapter;
use sysinfo::System;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _observability = api::init_observability()?;

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

    let admin = Arc::new(AdminService::default());
    let monitor = Arc::new(MonitorRegistry::default());

    let engine = Arc::new(DecisionEngine::new(
        Arc::new(PlannerAgent::default()),
        Arc::new(ExecutionAgent::default()),
        Arc::new(GovernanceAgent::new(policy_engine.clone())),
        Arc::new(CriticAgent::default()),
        state_store,
        monitor.clone(),
        mcp_adapter,
        model_router,
    ));
    let app_state = AppState {
        engine,
        admin,
        monitor,
    };
    let monitor_for_runtime = app_state.monitor.clone();
    tokio::spawn(async move {
        let interval_secs = std::env::var("RUNTIME_MONITOR_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(15);
        let mut ticker = tokio::time::interval(std::time::Duration::from_secs(interval_secs));
        let mut system = System::new_all();

        loop {
            ticker.tick().await;
            system.refresh_cpu_usage();
            system.refresh_memory();

            let cpu_usage_percent = system.global_cpu_info().cpu_usage();
            let memory_usage_mb = system.used_memory() / (1024 * 1024);
            let process_count = system.processes().len();

            monitor_for_runtime
                .update_runtime_metrics(RuntimeMetrics {
                    cpu_usage_percent,
                    memory_usage_mb,
                    process_count,
                    updated_at: Utc::now(),
                })
                .await;

            capture_runtime_pressure(cpu_usage_percent, memory_usage_mb, process_count);
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(handle_root))
        .route("/healthz", get(handle_health))
        .route("/readyz", get(handle_health))
        .route("/proposed-action", post(handle_proposed_action))
        .route("/proposed-action", options(handle_preflight))
        .route("/validate-action", post(handle_proposed_action))
        .route("/validate-action", options(handle_preflight))
        .route("/audit", get(handle_audit_log))
        .route("/audit", options(handle_preflight))
        .route("/monitor/overview", get(handle_monitor_overview))
        .route("/monitor/overview", options(handle_preflight))
        .route("/monitor/integrations", post(handle_register_integration))
        .route("/monitor/integrations", get(handle_list_integrations))
        .route("/monitor/integrations", options(handle_preflight))
        .route("/auth/login", post(handle_login))
        .route("/auth/login", options(handle_preflight))
        .route("/auth/register", post(handle_register))
        .route("/auth/register", options(handle_preflight))
        .route("/auth/change-password", post(handle_change_password))
        .route("/auth/change-password", options(handle_preflight))
        .route(
            "/auth/reset-password/request",
            post(handle_reset_password_request),
        )
        .route("/auth/reset-password/request", options(handle_preflight))
        .route(
            "/auth/reset-password/confirm",
            post(handle_reset_password_confirm),
        )
        .route("/auth/reset-password/confirm", options(handle_preflight))
        .route("/admin/tenants", get(handle_list_tenants))
        .route("/admin/tenants", options(handle_preflight))
        .route("/admin/settings", get(handle_get_default_settings))
        .route("/admin/settings", post(handle_update_default_settings))
        .route("/admin/settings", options(handle_preflight))
        .route("/admin/settings/:tenant_id", get(handle_get_settings))
        .route("/admin/settings/:tenant_id", post(handle_update_settings))
        .route("/admin/settings/:tenant_id", options(handle_preflight))
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

async fn handle_root() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "service": "agent-decision-gate",
            "status": "ok"
        })),
    )
}

async fn handle_health() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok"
        })),
    )
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

async fn handle_monitor_overview(State(state): State<AppState>) -> impl IntoResponse {
    let data = state.engine.monitor_overview().await;
    Json(data)
}

async fn handle_register_integration(
    State(state): State<AppState>,
    Json(payload): Json<IntegrationRegistrationRequest>,
) -> impl IntoResponse {
    match state.monitor.register(payload).await {
        Some(record) => (StatusCode::OK, Json(record)).into_response(),
        None => (StatusCode::BAD_REQUEST, "integration is required").into_response(),
    }
}

async fn handle_list_integrations(State(state): State<AppState>) -> impl IntoResponse {
    let data = state.monitor.list().await;
    Json(IntegrationRegistryResponse { data })
}

async fn handle_login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    match state.admin.login(&payload) {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(AdminError::Validation(msg)) => (StatusCode::BAD_REQUEST, msg).into_response(),
        Err(AdminError::Unauthorized) => StatusCode::UNAUTHORIZED.into_response(),
        Err(AdminError::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Err(AdminError::State) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn handle_register(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    let actor = bearer_token(&headers)
        .as_deref()
        .and_then(|token| state.admin.authorize(token).ok());

    match state.admin.register(&payload, actor.as_ref()) {
        Ok(user) => (StatusCode::OK, Json(user)).into_response(),
        Err(AdminError::Validation(msg)) => (StatusCode::BAD_REQUEST, msg).into_response(),
        Err(AdminError::Unauthorized) => StatusCode::UNAUTHORIZED.into_response(),
        Err(AdminError::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Err(AdminError::State) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn handle_change_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ChangePasswordRequest>,
) -> impl IntoResponse {
    let Some(token) = bearer_token(&headers) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    let Ok(auth) = state.admin.authorize(&token) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    match state.admin.change_password(&auth, &payload) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(AdminError::Validation(msg)) => (StatusCode::BAD_REQUEST, msg).into_response(),
        Err(AdminError::Unauthorized) => StatusCode::UNAUTHORIZED.into_response(),
        Err(AdminError::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Err(AdminError::State) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn handle_reset_password_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ResetPasswordRequest>,
) -> impl IntoResponse {
    let Some(token) = bearer_token(&headers) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    let Ok(auth) = state.admin.authorize(&token) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    if !auth.is_admin() {
        return StatusCode::FORBIDDEN.into_response();
    }

    match state.admin.issue_password_reset(&payload.username) {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(AdminError::Validation(msg)) => (StatusCode::BAD_REQUEST, msg).into_response(),
        Err(AdminError::Unauthorized) => StatusCode::UNAUTHORIZED.into_response(),
        Err(AdminError::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Err(AdminError::State) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn handle_reset_password_confirm(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordConfirmRequest>,
) -> impl IntoResponse {
    match state.admin.confirm_password_reset(&payload) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(AdminError::Validation(msg)) => (StatusCode::BAD_REQUEST, msg).into_response(),
        Err(AdminError::Unauthorized) => StatusCode::UNAUTHORIZED.into_response(),
        Err(AdminError::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Err(AdminError::State) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn handle_list_tenants(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let token = bearer_token(&headers);
    if let Some(token) = token {
        if state.admin.authorize(&token).is_ok() {
            return match state.admin.list_tenants() {
                Ok(tenants) => (StatusCode::OK, Json(tenants)).into_response(),
                Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
            };
        }
    }
    StatusCode::UNAUTHORIZED.into_response()
}

async fn handle_get_default_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    handle_get_settings(State(state), headers, Path("default".to_string())).await
}

async fn handle_update_default_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateSettingsRequest>,
) -> impl IntoResponse {
    handle_update_settings(
        State(state),
        headers,
        Path("default".to_string()),
        Json(payload),
    )
    .await
}

async fn handle_get_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(tenant_id): Path<String>,
) -> impl IntoResponse {
    let token = bearer_token(&headers);
    if let Some(token) = token {
        if state.admin.authorize(&token).is_ok() {
            return match state.admin.get_settings_for_tenant(&tenant_id) {
                Ok(settings) => (StatusCode::OK, Json(settings)).into_response(),
                Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
            };
        }
    }
    StatusCode::UNAUTHORIZED.into_response()
}

async fn handle_update_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(tenant_id): Path<String>,
    Json(payload): Json<UpdateSettingsRequest>,
) -> impl IntoResponse {
    let Some(token) = bearer_token(&headers) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    let Ok(auth) = state.admin.authorize(&token) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    if !auth.can_write_settings() {
        return StatusCode::FORBIDDEN.into_response();
    }

    match state.admin.update_settings_for_tenant(&tenant_id, payload) {
        Ok(settings) => (StatusCode::OK, Json(settings)).into_response(),
        Err(AdminError::Validation(msg)) => (StatusCode::BAD_REQUEST, msg).into_response(),
        Err(AdminError::Unauthorized) => StatusCode::UNAUTHORIZED.into_response(),
        Err(AdminError::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Err(AdminError::State) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn handle_preflight() -> impl IntoResponse {
    StatusCode::NO_CONTENT
}

fn bearer_token(headers: &HeaderMap) -> Option<String> {
    let raw = headers.get("authorization")?.to_str().ok()?;
    raw.strip_prefix("Bearer ").map(|s| s.to_string())
}
