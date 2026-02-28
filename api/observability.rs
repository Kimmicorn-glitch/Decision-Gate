use std::env;

use opentelemetry::global;
use opentelemetry_sdk::trace::TracerProvider;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use uuid::Uuid;

pub struct ObservabilityGuards {
    _sentry: Option<sentry::ClientInitGuard>,
}

pub fn init_observability() -> Result<ObservabilityGuards, Box<dyn std::error::Error>> {
    let provider = TracerProvider::builder().build();
    global::set_tracer_provider(provider);

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer().json())
        .try_init()?;

    let sentry_guard = init_sentry();

    Ok(ObservabilityGuards {
        _sentry: sentry_guard,
    })
}

fn init_sentry() -> Option<sentry::ClientInitGuard> {
    let dsn = env::var("SENTRY_DSN")
        .ok()
        .filter(|v| !v.trim().is_empty())?;

    let traces_sample_rate = env::var("SENTRY_TRACES_SAMPLE_RATE")
        .ok()
        .and_then(|value| value.parse::<f32>().ok())
        .unwrap_or(0.2);

    let environment = env::var("SENTRY_ENVIRONMENT")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| "development".to_string());

    let release = format!("agent-decision-gate@{}", env!("CARGO_PKG_VERSION"));

    let guard = sentry::init((
        dsn,
        sentry::ClientOptions {
            release: Some(release.into()),
            environment: Some(environment.clone().into()),
            traces_sample_rate,
            ..Default::default()
        },
    ));

    tracing::info!(
        sentry_environment = %environment,
        sentry_traces_sample_rate = traces_sample_rate,
        "sentry initialized"
    );

    Some(guard)
}

pub fn capture_patch_request(
    trace_id: &str,
    audit_id: Uuid,
    action_type: &str,
    risk_level: Option<&str>,
    integration_source: Option<&str>,
) {
    sentry::with_scope(
        |scope| {
            scope.set_tag("decision_gate.action_category", "code_patch");
            scope.set_tag(
                "decision_gate.action_type",
                action_type.to_ascii_lowercase(),
            );
            scope.set_tag("decision_gate.trace_id", trace_id.to_string());
            scope.set_extra("audit_id", audit_id.to_string().into());
            if let Some(level) = risk_level {
                scope.set_extra("risk_level", level.to_string().into());
            }
            if let Some(source) = integration_source {
                scope.set_tag("integration_source", source.to_ascii_lowercase());
            }
        },
        || {
            sentry::capture_message(
                "Patch request received by decision gate",
                sentry::Level::Info,
            );
        },
    );
}

pub fn capture_patch_tool_call(trace_id: &str, tool_name: &str, status: &str) {
    sentry::with_scope(
        |scope| {
            scope.set_tag("decision_gate.action_category", "code_patch");
            scope.set_tag("decision_gate.trace_id", trace_id.to_string());
            scope.set_tag("tool_name", tool_name.to_string());
            scope.set_extra("tool_status", status.to_string().into());
        },
        || {
            sentry::capture_message("Patch workflow tool call recorded", sentry::Level::Info);
        },
    );
}

pub fn capture_patch_decision(
    trace_id: &str,
    decision: &str,
    confidence_score: f32,
    policy_violations: usize,
) {
    sentry::with_scope(
        |scope| {
            scope.set_tag("decision_gate.action_category", "code_patch");
            scope.set_tag("decision_gate.trace_id", trace_id.to_string());
            scope.set_tag("decision", decision.to_string());
            scope.set_extra("confidence_score", confidence_score.into());
            scope.set_extra("policy_violations", policy_violations.into());
        },
        || {
            sentry::capture_message("Patch decision emitted", sentry::Level::Info);
        },
    );
}

pub fn capture_pipeline_error(trace_id: &str, audit_id: Uuid, error: &str) {
    sentry::with_scope(
        |scope| {
            scope.set_tag("decision_gate.trace_id", trace_id.to_string());
            scope.set_extra("audit_id", audit_id.to_string().into());
        },
        || {
            sentry::capture_message(
                &format!("Decision pipeline failure: {error}"),
                sentry::Level::Error,
            );
        },
    );
}

pub fn capture_runtime_pressure(cpu_usage_percent: f32, memory_usage_mb: u64, process_count: usize) {
    let cpu_threshold = env::var("SENTRY_CPU_ALERT_THRESHOLD")
        .ok()
        .and_then(|v| v.parse::<f32>().ok())
        .unwrap_or(85.0);
    let memory_threshold_mb = env::var("SENTRY_MEMORY_ALERT_MB")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(2048);

    if cpu_usage_percent < cpu_threshold && memory_usage_mb < memory_threshold_mb {
        return;
    }

    sentry::with_scope(
        |scope| {
            scope.set_tag("decision_gate.runtime_alert", "true");
            scope.set_extra("cpu_usage_percent", cpu_usage_percent.into());
            scope.set_extra("memory_usage_mb", memory_usage_mb.into());
            scope.set_extra("process_count", process_count.into());
            scope.set_extra("cpu_threshold", cpu_threshold.into());
            scope.set_extra("memory_threshold_mb", memory_threshold_mb.into());
        },
        || {
            sentry::capture_message(
                "Runtime pressure detected on decision gate",
                sentry::Level::Warning,
            );
        },
    );
}
