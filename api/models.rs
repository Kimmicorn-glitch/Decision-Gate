use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposedActionRequest {
    pub action_type: String,
    pub description: String,
    #[serde(default)]
    pub metadata: Value,
    pub risk_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposedTask {
    pub id: String,
    pub task_type: String,
    pub objective: String,
    #[serde(default)]
    pub required_permissions: Vec<String>,
    #[serde(default)]
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannerOutput {
    pub tasks: Vec<ProposedTask>,
    pub planning_notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionOutput {
    pub feasibility_score: f32,
    #[serde(default)]
    pub detected_risks: Vec<String>,
    #[serde(default)]
    pub tool_calls: Vec<ToolCallRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceOutput {
    pub policy_violations: Vec<PolicyViolation>,
    pub policy_outcome: Decision,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CriticOutput {
    pub challenge_notes: Vec<String>,
    pub confidence_adjustment: f32,
    pub recommended_decision: Decision,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyViolation {
    pub policy_id: String,
    pub severity: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallRecord {
    pub tool_name: String,
    pub trace_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "UPPERCASE")]
pub enum Decision {
    Approve,
    Revise,
    Block,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionResponse {
    pub decision: Decision,
    pub reasoning: String,
    pub policy_violations: Vec<PolicyViolation>,
    pub confidence_score: f32,
    pub audit_id: Uuid,
    pub trace_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionAuditRecord {
    pub audit_id: Uuid,
    pub trace_id: String,
    pub received_at: DateTime<Utc>,
    pub request: ProposedActionRequest,
    pub planner: PlannerOutput,
    pub execution: ExecutionOutput,
    pub governance: GovernanceOutput,
    pub critic: CriticOutput,
    pub final_response: DecisionResponse,
    pub selected_models: SelectedModels,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectedModels {
    pub planning_model: String,
    pub execution_model: String,
    pub governance_model: String,
    pub critic_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditListItem {
    pub audit_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub decision: Decision,
    pub action_type: String,
    pub confidence_score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditListResponse {
    pub data: Vec<AuditListItem>,
}
