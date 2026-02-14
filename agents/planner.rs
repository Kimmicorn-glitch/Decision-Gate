use async_trait::async_trait;

use crate::{
    agents::{AgentContext, AgentError, Planner},
    api::{PlannerOutput, ProposedActionRequest, ProposedTask},
};

#[derive(Default)]
pub struct PlannerAgent;

#[async_trait]
impl Planner for PlannerAgent {
    async fn plan(
        &self,
        request: &ProposedActionRequest,
        _context: &AgentContext,
    ) -> Result<PlannerOutput, AgentError> {
        if request.description.trim().is_empty() {
            return Err(AgentError::Validation(
                "description must not be empty".to_string(),
            ));
        }

        let task = ProposedTask {
            id: "task-1".to_string(),
            task_type: request.action_type.clone(),
            objective: request.description.clone(),
            required_permissions: extract_permissions(request),
            dependencies: vec![],
        };

        Ok(PlannerOutput {
            tasks: vec![task],
            planning_notes: vec![
                "single-task decomposition".to_string(),
                "deterministic planner policy v1".to_string(),
            ],
        })
    }
}

fn extract_permissions(request: &ProposedActionRequest) -> Vec<String> {
    let mut permissions = vec!["deploy:service".to_string()];

    let lowered = request.description.to_ascii_lowercase();
    if lowered.contains("elevated") || lowered.contains("admin") {
        permissions.push("iam:elevated".to_string());
    }

    permissions
}
