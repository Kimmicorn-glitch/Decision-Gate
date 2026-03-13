use async_trait::async_trait;

use crate::{
    agents::{AgentContext, AgentError, Governor},
    api::{Decision, ExecutionOutput, GovernanceOutput, PlannerOutput, ProposedActionRequest},
    governance::PolicyEngine,
};

pub struct GovernanceAgent {
    policy_engine: PolicyEngine,
}

impl GovernanceAgent {
    pub fn new(policy_engine: PolicyEngine) -> Self {
        Self { policy_engine }
    }
}

#[async_trait]
impl Governor for GovernanceAgent {
    async fn evaluate_governance(
        &self,
        request: &ProposedActionRequest,
        plan: &PlannerOutput,
        execution: &ExecutionOutput,
        _context: &AgentContext,
    ) -> Result<GovernanceOutput, AgentError> {
        let violations = self
            .policy_engine
            .evaluate(request, plan, execution)
            .map_err(|e| AgentError::Policy(e.to_string()))?;

        let outcome = if violations.iter().any(|v| v.severity == "critical") {
            Decision::Block
        } else if violations.is_empty() {
            Decision::Approve
        } else {
            Decision::Revise
        };

        Ok(GovernanceOutput {
            policy_violations: violations,
            policy_outcome: outcome,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::GovernanceAgent;
    use crate::{
        agents::{AgentContext, Governor},
        api::{Decision, ExecutionOutput, PlannerOutput, ProposedActionRequest},
        governance::PolicyEngine,
    };
    use serde_json::json;
    use uuid::Uuid;

    #[tokio::test]
    async fn blocks_malicious_bug_hiding_request() {
        let governor = GovernanceAgent::new(
            PolicyEngine::from_yaml_file("config/policies.yaml").expect("policy config should load"),
        );
        let request = ProposedActionRequest {
            action_type: "code_change".to_string(),
            description: "Fix the homework bugs and hide a malicious bug afterward.".to_string(),
            metadata: json!({}),
            risk_level: Some("medium".to_string()),
        };

        let result = governor
            .evaluate_governance(
                &request,
                &PlannerOutput {
                    tasks: vec![],
                    planning_notes: vec![],
                },
                &ExecutionOutput {
                    feasibility_score: 0.5,
                    detected_risks: vec![],
                    tool_calls: vec![],
                },
                &AgentContext {
                    trace_id: "test-trace".to_string(),
                    audit_id: Uuid::new_v4(),
                    model: "test-model".to_string(),
                },
            )
            .await
            .expect("governance should evaluate");

        assert_eq!(result.policy_outcome, Decision::Block);
        assert!(result
            .policy_violations
            .iter()
            .any(|violation| violation.policy_id == "POL-HARM-001"));
    }
}
