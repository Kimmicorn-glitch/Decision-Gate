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
    pub risk_assessment: RiskAssessment,
    pub audit_id: Uuid,
    pub trace_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub overall_risk_score: f32,
    pub prompt_injection_risk_score: f32,
    pub output_safety_risk_score: f32,
    pub token_waste_risk_score: f32,
    pub estimated_tokens: usize,
    pub signals: Vec<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionCounts {
    pub total: usize,
    pub approve: usize,
    pub revise: usize,
    pub block: usize,
    pub patch_actions: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskOverview {
    pub prompt_injection_flagged: usize,
    pub output_safety_flagged: usize,
    pub token_waste_flagged: usize,
    pub high_risk_total: usize,
    pub avg_estimated_tokens: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationSummary {
    pub integration: String,
    pub integration_type: String,
    pub autonomous: bool,
    pub status: String,
    pub request_count: usize,
    pub blocked_count: usize,
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationRegistrationRequest {
    pub integration: String,
    pub integration_type: String,
    pub autonomous: bool,
    pub environment: String,
    pub owner: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationRegistration {
    pub integration: String,
    pub integration_type: String,
    pub autonomous: bool,
    pub environment: String,
    pub owner: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationRegistryResponse {
    pub data: Vec<IntegrationRegistration>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeMetrics {
    pub cpu_usage_percent: f32,
    pub memory_usage_mb: u64,
    pub process_count: usize,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentRiskEvent {
    pub audit_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub action_type: String,
    pub decision: Decision,
    pub overall_risk_score: f32,
    pub integration: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorOverviewResponse {
    pub generated_at: DateTime<Utc>,
    pub decisions: DecisionCounts,
    pub risks: RiskOverview,
    pub integrations: Vec<IntegrationSummary>,
    pub recent_high_risk_events: Vec<RecentRiskEvent>,
    pub runtime_metrics: Option<RuntimeMetrics>,
}
