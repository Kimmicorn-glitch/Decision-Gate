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
