use async_trait::async_trait;

use crate::{
    agents::{AgentContext, AgentError, Critic},
    api::{
        CriticOutput, Decision, ExecutionOutput, GovernanceOutput, PlannerOutput,
        ProposedActionRequest,
    },
};

#[derive(Default)]
pub struct CriticAgent;

#[async_trait]
impl Critic for CriticAgent {
    async fn critique(
        &self,
        _request: &ProposedActionRequest,
        _plan: &PlannerOutput,
        execution: &ExecutionOutput,
        governance: &GovernanceOutput,
        _context: &AgentContext,
    ) -> Result<CriticOutput, AgentError> {
        let mut notes = Vec::new();

        if execution
            .detected_risks
            .iter()
            .any(|r| r == "privilege_escalation")
        {
            notes.push(
                "privilege escalation risk requires explicit break-glass workflow".to_string(),
            );
        }

        if governance.policy_violations.is_empty() {
            notes.push("no policy conflicts detected".to_string());
            return Ok(CriticOutput {
                challenge_notes: notes,
                confidence_adjustment: 0.05,
                recommended_decision: Decision::Approve,
            });
        }

        let recommended_decision = if governance
            .policy_violations
            .iter()
            .any(|v| v.severity == "critical")
        {
            Decision::Block
        } else {
            Decision::Revise
        };

        Ok(CriticOutput {
            challenge_notes: notes,
            confidence_adjustment: -0.1,
            recommended_decision,
        })
    }
}
