use async_trait::async_trait;

use crate::{
    agents::{AgentContext, AgentError, Executor},
    api::{ExecutionOutput, PlannerOutput, ProposedActionRequest, ToolCallRecord},
};

#[derive(Default)]
pub struct ExecutionAgent;

#[async_trait]
impl Executor for ExecutionAgent {
    async fn evaluate_execution(
        &self,
        request: &ProposedActionRequest,
        _plan: &PlannerOutput,
        context: &AgentContext,
    ) -> Result<ExecutionOutput, AgentError> {
        let mut risks = Vec::new();
        let lowered = request.description.to_ascii_lowercase();

        if lowered.contains("production") {
            risks.push("production_target".to_string());
        }
        if lowered.contains("elevated") || lowered.contains("privilege") {
            risks.push("privilege_escalation".to_string());
        }

        let feasibility_score = if risks.is_empty() { 0.95 } else { 0.75 };

        Ok(ExecutionOutput {
            feasibility_score,
            detected_risks: risks,
            tool_calls: vec![ToolCallRecord {
                tool_name: "azure-function-preflight".to_string(),
                trace_id: context.trace_id.clone(),
                status: "SIMULATED".to_string(),
            }],
        })
    }
}
