use std::{collections::HashMap, fs, sync::Arc, time::Instant};

use chrono::Utc;
use serde::Deserialize;
use tracing::info;
use uuid::Uuid;

use crate::{
    agents::{AgentContext, AgentError, Critic, Executor, Governor, Planner},
    api::{
        capture_patch_decision, capture_patch_request, capture_patch_tool_call,
        capture_pipeline_error, AuditListItem, CriticOutput, Decision, DecisionAuditRecord,
        DecisionCounts, DecisionResponse, GovernanceOutput, IntegrationRegistrationRequest,
        IntegrationSummary, MonitorOverviewResponse, MonitorRegistry, ProposedActionRequest,
        RecentRiskEvent, RiskAssessment, RiskOverview, SelectedModels, StateStore,
    },
    mcp::McpAdapter,
};

#[derive(Debug, Clone, Deserialize)]
pub struct FoundryModelRouter {
    routes: HashMap<String, String>,
    default_model: String,
}

impl FoundryModelRouter {
    pub fn from_yaml_file(path: &str) -> Result<Self, AgentError> {
        let raw = fs::read_to_string(path)
            .map_err(|e| AgentError::Config(format!("failed reading model router config: {e}")))?;
        serde_yaml::from_str(&raw)
            .map_err(|e| AgentError::Config(format!("failed parsing model router config: {e}")))
    }

    pub fn model_for(&self, stage: &str) -> String {
        self.routes
            .get(stage)
            .cloned()
            .unwrap_or_else(|| self.default_model.clone())
    }
}

pub struct DecisionEngine {
    planner: Arc<dyn Planner>,
    executor: Arc<dyn Executor>,
    governor: Arc<dyn Governor>,
    critic: Arc<dyn Critic>,
    state_store: Arc<dyn StateStore>,
    monitor_registry: Arc<MonitorRegistry>,
    mcp: Arc<dyn McpAdapter>,
    model_router: FoundryModelRouter,
}

impl DecisionEngine {
    pub fn new(
        planner: Arc<dyn Planner>,
        executor: Arc<dyn Executor>,
        governor: Arc<dyn Governor>,
        critic: Arc<dyn Critic>,
        state_store: Arc<dyn StateStore>,
        monitor_registry: Arc<MonitorRegistry>,
        mcp: Arc<dyn McpAdapter>,
        model_router: FoundryModelRouter,
    ) -> Self {
        Self {
            planner,
            executor,
            governor,
            critic,
            state_store,
            monitor_registry,
            mcp,
            model_router,
        }
    }

    pub async fn evaluate(&self, request: ProposedActionRequest) -> DecisionResponse {
        let start = Instant::now();
        let trace_id = Uuid::new_v4().to_string();
        let audit_id = Uuid::new_v4();
        let is_patch_action = is_patch_action(&request);

        if is_patch_action {
            capture_patch_request(
                &trace_id,
                audit_id,
                &request.action_type,
                request.risk_level.as_deref(),
                integration_source(&request),
            );
        }

        if let Some(source) = integration_source(&request) {
            let _ = self
                .monitor_registry
                .register(IntegrationRegistrationRequest {
                    integration: source.to_string(),
                    integration_type: classify_integration_type(source).to_string(),
                    autonomous: is_autonomous_request(&request),
                    environment: request
                        .metadata
                        .as_object()
                        .and_then(|meta| meta.get("environment"))
                        .and_then(|value| value.as_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    owner: "auto-discovered".to_string(),
                    status: "active".to_string(),
                })
                .await;
        }

        let selected_models = SelectedModels {
            planning_model: self.model_router.model_for("planner"),
            execution_model: self.model_router.model_for("execution"),
            governance_model: self.model_router.model_for("governance"),
            critic_model: self.model_router.model_for("critic"),
        };
        let estimated_tokens = estimate_tokens(&request.description);
        info!(
            trace_id = %trace_id,
            audit_id = %audit_id,
            planner_model = %selected_models.planning_model,
            execution_model = %selected_models.execution_model,
            governance_model = %selected_models.governance_model,
            critic_model = %selected_models.critic_model,
            estimated_tokens = estimated_tokens,
            "model routing selected"
        );

        let context = AgentContext {
            trace_id: trace_id.clone(),
            audit_id,
            model: selected_models.planning_model.clone(),
        };

        let planner_out = match self.planner.plan(&request, &context).await {
            Ok(out) => out,
            Err(e) => return self.error_response(audit_id, trace_id, e),
        };

        let exec_ctx = AgentContext {
            model: selected_models.execution_model.clone(),
            ..context.clone()
        };

        let execution_out = match self
            .executor
            .evaluate_execution(&request, &planner_out, &exec_ctx)
            .await
        {
            Ok(out) => out,
            Err(e) => return self.error_response(audit_id, trace_id, e),
        };

        let gov_ctx = AgentContext {
            model: selected_models.governance_model.clone(),
            ..context.clone()
        };

        let governance_out = match self
            .governor
            .evaluate_governance(&request, &planner_out, &execution_out, &gov_ctx)
            .await
        {
            Ok(out) => out,
            Err(e) => return self.error_response(audit_id, trace_id, e),
        };

        for call in &execution_out.tool_calls {
            if is_patch_action {
                capture_patch_tool_call(&trace_id, &call.tool_name, &call.status);
            }

            let _ = self
                .mcp
                .register_tool_usage(&trace_id, &call.tool_name, &call.status)
                .await;
        }

        let critic_ctx = AgentContext {
            model: selected_models.critic_model.clone(),
            ..context
        };

        let critic_out = match self
            .critic
            .critique(
                &request,
                &planner_out,
                &execution_out,
                &governance_out,
                &critic_ctx,
            )
            .await
        {
            Ok(out) => out,
            Err(e) => return self.error_response(audit_id, trace_id, e),
        };

        let risk_assessment = assess_risk(&request, &execution_out, estimated_tokens);

        let final_response = aggregate_decision(
            audit_id,
            trace_id.clone(),
            &request,
            &execution_out,
            &governance_out,
            &critic_out,
            &risk_assessment,
        );

        let audit = DecisionAuditRecord {
            audit_id,
            trace_id: trace_id.clone(),
            received_at: Utc::now(),
            request: request.clone(),
            planner: planner_out,
            execution: execution_out,
            governance: governance_out,
            critic: critic_out,
            final_response: final_response.clone(),
            selected_models,
        };

        self.state_store.save_audit(audit).await;

        let _ = self
            .mcp
            .log_decision(&trace_id, &final_response, start.elapsed())
            .await;
        info!(
            trace_id = %trace_id,
            audit_id = %audit_id,
            latency_ms = start.elapsed().as_millis(),
            decision = ?final_response.decision,
            confidence_score = final_response.confidence_score,
            overall_risk = final_response.risk_assessment.overall_risk_score,
            policy_violations = final_response.policy_violations.len(),
            "decision emitted"
        );

        if is_patch_action {
            capture_patch_decision(
                &trace_id,
                format_decision(&final_response.decision),
                final_response.confidence_score,
                final_response.policy_violations.len(),
            );
        }

        final_response
    }

    pub async fn list_audits(&self) -> Vec<AuditListItem> {
        let mut records = self.state_store.list_audits().await;
        records.sort_by(|a, b| b.received_at.cmp(&a.received_at));
        records
            .into_iter()
            .map(|record| AuditListItem {
                audit_id: record.audit_id,
                timestamp: record.received_at,
                decision: record.final_response.decision,
                action_type: record.request.action_type,
                confidence_score: record.final_response.confidence_score,
            })
            .collect()
    }

    fn error_response(
        &self,
        audit_id: Uuid,
        trace_id: String,
        error: AgentError,
    ) -> DecisionResponse {
        capture_pipeline_error(&trace_id, audit_id, &error.to_string());

        DecisionResponse {
            decision: Decision::Block,
            reasoning: format!("pipeline failure: {error}"),
            policy_violations: vec![],
            confidence_score: 0.0,
            risk_assessment: default_risk_assessment(),
            audit_id,
            trace_id,
        }
    }

    pub async fn monitor_overview(&self) -> MonitorOverviewResponse {
        let mut records = self.state_store.list_audits().await;
        records.sort_by(|a, b| b.received_at.cmp(&a.received_at));

        let mut decisions = DecisionCounts {
            total: 0,
            approve: 0,
            revise: 0,
            block: 0,
            patch_actions: 0,
        };
        let mut risks = RiskOverview {
            prompt_injection_flagged: 0,
            output_safety_flagged: 0,
            token_waste_flagged: 0,
            high_risk_total: 0,
            avg_estimated_tokens: 0,
        };

        let mut tokens_total = 0usize;
        let mut integrations: HashMap<String, IntegrationAccumulator> = HashMap::new();
        let mut recent_high_risk_events = Vec::new();

        for record in &records {
            decisions.total += 1;
            match record.final_response.decision {
                Decision::Approve => decisions.approve += 1,
                Decision::Revise => decisions.revise += 1,
                Decision::Block => decisions.block += 1,
            }

            if is_patch_action(&record.request) {
                decisions.patch_actions += 1;
            }

            let assessment = &record.final_response.risk_assessment;
            tokens_total += assessment.estimated_tokens;

            if assessment.prompt_injection_risk_score >= 0.65 {
                risks.prompt_injection_flagged += 1;
            }
            if assessment.output_safety_risk_score >= 0.65 {
                risks.output_safety_flagged += 1;
            }
            if assessment.token_waste_risk_score >= 0.65 {
                risks.token_waste_flagged += 1;
            }

            if assessment.overall_risk_score >= 0.65 {
                risks.high_risk_total += 1;
                recent_high_risk_events.push(RecentRiskEvent {
                    audit_id: record.audit_id,
                    timestamp: record.received_at,
                    action_type: record.request.action_type.clone(),
                    decision: record.final_response.decision.clone(),
                    overall_risk_score: assessment.overall_risk_score,
                    integration: integration_source(&record.request)
                        .unwrap_or("unknown")
                        .to_string(),
                });
            }

            let integration_name = integration_source(&record.request)
                .unwrap_or("unknown")
                .to_string();
            let entry = integrations
                .entry(integration_name.clone())
                .or_insert_with(|| IntegrationAccumulator {
                    integration: integration_name,
                    integration_type: classify_integration_type(
                        integration_source(&record.request).unwrap_or("unknown"),
                    )
                    .to_string(),
                    autonomous: false,
                    request_count: 0,
                    blocked_count: 0,
                    last_seen: record.received_at,
                    declared_status: None,
                });

            entry.request_count += 1;
            if record.final_response.decision == Decision::Block {
                entry.blocked_count += 1;
            }
            entry.autonomous = entry.autonomous || is_autonomous_request(&record.request);
            if record.received_at > entry.last_seen {
                entry.last_seen = record.received_at;
            }
        }

        if decisions.total > 0 {
            risks.avg_estimated_tokens = tokens_total / decisions.total;
        }

        for registered in self.monitor_registry.list().await {
            let key = registered.integration.to_ascii_lowercase();
            integrations
                .entry(key)
                .and_modify(|entry| {
                    entry.integration = registered.integration.clone();
                    entry.integration_type = registered.integration_type.clone();
                    entry.autonomous = registered.autonomous;
                    entry.declared_status = Some(registered.status.clone());
                    if registered.updated_at > entry.last_seen {
                        entry.last_seen = registered.updated_at;
                    }
                })
                .or_insert_with(|| IntegrationAccumulator {
                    integration: registered.integration,
                    integration_type: registered.integration_type,
                    autonomous: registered.autonomous,
                    request_count: 0,
                    blocked_count: 0,
                    last_seen: registered.updated_at,
                    declared_status: Some(registered.status),
                });
        }

        let mut integration_rows: Vec<IntegrationSummary> = integrations
            .into_values()
            .map(|item| {
                let status = if item.request_count == 0 {
                    item.declared_status
                        .unwrap_or_else(|| "registered".to_string())
                } else if item.blocked_count * 2 >= item.request_count {
                    "guarded".to_string()
                } else if item.blocked_count == 0 {
                    "healthy".to_string()
                } else {
                    "watch".to_string()
                };

                IntegrationSummary {
                    integration: item.integration,
                    integration_type: item.integration_type,
                    autonomous: item.autonomous,
                    status,
                    request_count: item.request_count,
                    blocked_count: item.blocked_count,
                    last_seen: item.last_seen,
                }
            })
            .collect();

        integration_rows.sort_by(|a, b| {
            b.request_count
                .cmp(&a.request_count)
                .then_with(|| b.last_seen.cmp(&a.last_seen))
        });

        recent_high_risk_events.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        recent_high_risk_events.truncate(10);

        MonitorOverviewResponse {
            generated_at: Utc::now(),
            decisions,
            risks,
            integrations: integration_rows,
            recent_high_risk_events,
            runtime_metrics: self.monitor_registry.runtime_metrics().await,
        }
    }
}

struct IntegrationAccumulator {
    integration: String,
    integration_type: String,
    autonomous: bool,
    request_count: usize,
    blocked_count: usize,
    last_seen: chrono::DateTime<Utc>,
    declared_status: Option<String>,
}

fn is_patch_action(request: &ProposedActionRequest) -> bool {
    let action = request.action_type.to_ascii_lowercase();
    if action.contains("patch") {
        return true;
    }

    let description = request.description.to_ascii_lowercase();
    description.contains("patch")
        || description.contains("hotfix")
        || description.contains("code change")
}

fn integration_source(request: &ProposedActionRequest) -> Option<&str> {
    let metadata = request.metadata.as_object()?;

    [
        "agent",
        "agent_name",
        "source_agent",
        "integration",
        "client",
        "orchestrator",
        "tool",
    ]
    .iter()
    .find_map(|key| metadata.get(*key).and_then(|value| value.as_str()))
}

fn is_autonomous_request(request: &ProposedActionRequest) -> bool {
    let Some(metadata) = request.metadata.as_object() else {
        return false;
    };

    metadata
        .get("autonomous")
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

fn classify_integration_type(source: &str) -> &'static str {
    let lowered = source.to_ascii_lowercase();
    if lowered.contains("github") || lowered.contains("gitlab") || lowered.contains("devops") {
        "devops"
    } else if lowered.contains("vscode")
        || lowered.contains("cursor")
        || lowered.contains("ide")
        || lowered.contains("editor")
    {
        "ide"
    } else if lowered.contains("enterprise") || lowered.contains("service") {
        "enterprise"
    } else if lowered.contains("agent") || lowered.contains("bot") {
        "agent"
    } else {
        "unknown"
    }
}

fn assess_risk(
    request: &ProposedActionRequest,
    execution: &crate::api::ExecutionOutput,
    estimated_tokens: usize,
) -> RiskAssessment {
    let description = request.description.to_ascii_lowercase();
    let mut prompt_injection_score = 0.0_f32;
    let mut output_safety_score = 0.0_f32;
    let mut token_waste_score = 0.0_f32;
    let mut signals = Vec::new();

    let prompt_injection_patterns = [
        "ignore previous",
        "ignore all previous",
        "system prompt",
        "jailbreak",
        "bypass guardrail",
        "disable policy",
        "prompt injection",
        "reveal secret",
        "exfiltrate",
        "credentials",
        "token leak",
    ];

    for pattern in prompt_injection_patterns {
        if description.contains(pattern) {
            prompt_injection_score += 0.14;
            signals.push(format!("prompt_injection_pattern:{pattern}"));
        }
    }

    let output_safety_patterns = [
        "delete production",
        "drop database",
        "rm -rf",
        "disable authentication",
        "shutdown cluster",
        "mass overwrite",
        "destructive",
    ];

    for pattern in output_safety_patterns {
        if description.contains(pattern) {
            output_safety_score += 0.16;
            signals.push(format!("output_safety_pattern:{pattern}"));
        }
    }

    if execution
        .detected_risks
        .iter()
        .any(|r| r == "privilege_escalation")
    {
        output_safety_score += 0.2;
        signals.push("execution_risk:privilege_escalation".to_string());
    }

    if estimated_tokens > 700 {
        token_waste_score += 0.75;
        signals.push("token_waste:very_high_estimate".to_string());
    } else if estimated_tokens > 350 {
        token_waste_score += 0.5;
        signals.push("token_waste:high_estimate".to_string());
    } else if estimated_tokens > 180 {
        token_waste_score += 0.3;
        signals.push("token_waste:moderate_estimate".to_string());
    }

    let waste_patterns = ["repeat", "re-run", "again and again", "loop", "exhaustive"];
    for pattern in waste_patterns {
        if description.contains(pattern) {
            token_waste_score += 0.12;
            signals.push(format!("token_waste_pattern:{pattern}"));
        }
    }

    prompt_injection_score = prompt_injection_score.clamp(0.0, 1.0);
    output_safety_score = output_safety_score.clamp(0.0, 1.0);
    token_waste_score = token_waste_score.clamp(0.0, 1.0);

    let overall_risk_score =
        (prompt_injection_score * 0.45 + output_safety_score * 0.35 + token_waste_score * 0.20)
            .clamp(0.0, 1.0);

    RiskAssessment {
        overall_risk_score,
        prompt_injection_risk_score: prompt_injection_score,
        output_safety_risk_score: output_safety_score,
        token_waste_risk_score: token_waste_score,
        estimated_tokens,
        signals,
    }
}

fn default_risk_assessment() -> RiskAssessment {
    RiskAssessment {
        overall_risk_score: 1.0,
        prompt_injection_risk_score: 1.0,
        output_safety_risk_score: 1.0,
        token_waste_risk_score: 0.0,
        estimated_tokens: 0,
        signals: vec!["pipeline_failure".to_string()],
    }
}

fn estimate_tokens(description: &str) -> usize {
    description.split_whitespace().count() * 2
}

fn aggregate_decision(
    audit_id: Uuid,
    trace_id: String,
    request: &ProposedActionRequest,
    execution: &crate::api::ExecutionOutput,
    governance: &GovernanceOutput,
    critic: &CriticOutput,
    risk_assessment: &RiskAssessment,
) -> DecisionResponse {
    let mut decision = [
        governance.policy_outcome.clone(),
        critic.recommended_decision.clone(),
    ]
    .into_iter()
    .max()
    .unwrap_or(Decision::Revise);

    let risk_floor = if risk_assessment.overall_risk_score >= 0.85 {
        Decision::Block
    } else if risk_assessment.overall_risk_score >= 0.65 {
        Decision::Revise
    } else {
        Decision::Approve
    };
    decision = decision.max(risk_floor);

    let base_confidence = match decision {
        Decision::Approve => 0.9,
        Decision::Revise => 0.65,
        Decision::Block => 0.4,
    };

    let risk_penalty = (execution.detected_risks.len() as f32) * 0.05;
    let risk_confidence_penalty = risk_assessment.overall_risk_score * 0.35;
    let confidence_score =
        (base_confidence + critic.confidence_adjustment - risk_penalty - risk_confidence_penalty)
            .clamp(0.0, 1.0);

    let reasoning = format!(
        "{} action '{}' evaluated with {} execution risk findings, {} policy violations, and {:.0}% overall safety risk",
        format_decision(&decision),
        request.action_type,
        execution.detected_risks.len(),
        governance.policy_violations.len(),
        risk_assessment.overall_risk_score * 100.0,
    );

    DecisionResponse {
        decision,
        reasoning,
        policy_violations: governance.policy_violations.clone(),
        confidence_score,
        risk_assessment: risk_assessment.clone(),
        audit_id,
        trace_id,
    }
}

fn format_decision(decision: &Decision) -> &'static str {
    match decision {
        Decision::Approve => "APPROVE",
        Decision::Revise => "REVISE",
        Decision::Block => "BLOCK",
    }
}
