use std::{collections::HashMap, fs, sync::Arc, time::Instant};

use chrono::Utc;
use serde::Deserialize;
use tracing::info;
use uuid::Uuid;

use crate::{
    agents::{AgentContext, AgentError, Critic, Executor, Governor, Planner},
    api::StateStore,
    api::{
        AuditListItem, CriticOutput, Decision, DecisionAuditRecord, DecisionResponse,
        GovernanceOutput, ProposedActionRequest, SelectedModels,
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
        mcp: Arc<dyn McpAdapter>,
        model_router: FoundryModelRouter,
    ) -> Self {
        Self {
            planner,
            executor,
            governor,
            critic,
            state_store,
            mcp,
            model_router,
        }
    }

    pub async fn evaluate(&self, request: ProposedActionRequest) -> DecisionResponse {
        let start = Instant::now();
        let trace_id = Uuid::new_v4().to_string();
        let audit_id = Uuid::new_v4();

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

        let final_response = aggregate_decision(
            audit_id,
            trace_id.clone(),
            &request,
            &execution_out,
            &governance_out,
            &critic_out,
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
            policy_violations = final_response.policy_violations.len(),
            "decision emitted"
        );

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
        DecisionResponse {
            decision: Decision::Block,
            reasoning: format!("pipeline failure: {error}"),
            policy_violations: vec![],
            confidence_score: 0.0,
            audit_id,
            trace_id,
        }
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
) -> DecisionResponse {
    let decision = [
        governance.policy_outcome.clone(),
        critic.recommended_decision.clone(),
    ]
    .into_iter()
    .max()
    .unwrap_or(Decision::Revise);

    let base_confidence = match decision {
        Decision::Approve => 0.9,
        Decision::Revise => 0.65,
        Decision::Block => 0.4,
    };

    let risk_penalty = (execution.detected_risks.len() as f32) * 0.05;
    let confidence_score =
        (base_confidence + critic.confidence_adjustment - risk_penalty).clamp(0.0, 1.0);

    let reasoning = format!(
        "{} action '{}' evaluated with {} risk findings and {} policy violations",
        format_decision(&decision),
        request.action_type,
        execution.detected_risks.len(),
        governance.policy_violations.len(),
    );

    DecisionResponse {
        decision,
        reasoning,
        policy_violations: governance.policy_violations.clone(),
        confidence_score,
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
