export type DecisionType = "APPROVE" | "REVISE" | "BLOCK";

export interface ProposedActionPayload {
  action_type: string;
  description: string;
  risk_level: "low" | "medium" | "high";
  metadata: Record<string, unknown>;
}

export interface PolicyViolationObject {
  policy_id: string;
  severity: string;
  message: string;
}

export interface AgentTrace {
  planner: string[];
  execution: string[];
  governance: string[];
  critic: string[];
}

export interface DecisionResponse {
  decision: DecisionType;
  reasoning: string;
  policy_violations: string[] | PolicyViolationObject[];
  confidence_score: number;
  risk_assessment?: RiskAssessment;
  audit_id: string;
  trace_id?: string;
  agent_trace?: AgentTrace;
}

export interface RiskAssessment {
  overall_risk_score: number;
  prompt_injection_risk_score: number;
  output_safety_risk_score: number;
  token_waste_risk_score: number;
  estimated_tokens: number;
  signals: string[];
}

export interface AuditRecord {
  audit_id: string;
  timestamp: string;
  decision: DecisionType;
  action_type: string;
  confidence_score: number;
}

export interface AuditListResponse {
  data: AuditRecord[];
}

export interface DecisionCounts {
  total: number;
  approve: number;
  revise: number;
  block: number;
  patch_actions: number;
}

export interface RiskOverview {
  prompt_injection_flagged: number;
  output_safety_flagged: number;
  token_waste_flagged: number;
  high_risk_total: number;
  avg_estimated_tokens: number;
}

export interface IntegrationSummary {
  integration: string;
  integration_type: string;
  autonomous: boolean;
  status: string;
  request_count: number;
  blocked_count: number;
  last_seen: string;
}

export interface IntegrationRegistrationRequest {
  integration: string;
  integration_type: string;
  autonomous: boolean;
  environment: string;
  owner: string;
  status: string;
}

export interface IntegrationRegistration {
  integration: string;
  integration_type: string;
  autonomous: boolean;
  environment: string;
  owner: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationRegistryResponse {
  data: IntegrationRegistration[];
}

export interface RecentRiskEvent {
  audit_id: string;
  timestamp: string;
  action_type: string;
  decision: DecisionType;
  overall_risk_score: number;
  integration: string;
}

export interface MonitorOverviewResponse {
  generated_at: string;
  decisions: DecisionCounts;
  risks: RiskOverview;
  integrations: IntegrationSummary[];
  recent_high_risk_events: RecentRiskEvent[];
  runtime_metrics?: RuntimeMetrics;
}

export interface RuntimeMetrics {
  cpu_usage_percent: number;
  memory_usage_mb: number;
  process_count: number;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role: "admin" | "operator" | "viewer";
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  username: string;
  role: "admin" | "operator" | "viewer";
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordRequest {
  username: string;
}

export interface ResetPasswordIssueResponse {
  reset_token: string;
  expires_at: string;
}

export interface DevOpsGatewaySettings {
  endpoint: string;
  pre_merge_policy_simulation: boolean;
  pipeline_provider: string;
}

export interface EnterpriseGatewaySettings {
  tenant: string;
  audit_export_sink: string;
  responsible_ai_logs_enabled: boolean;
}

export interface DataCenterGatewaySettings {
  regions: string[];
  ai_browser_providers: string[];
  background_enforcement: boolean;
  block_high_risk: boolean;
  block_cross_region: boolean;
  monthly_cost_cap_usd: number;
}

export interface TenantSettings {
  tenant_id: string;
  devops: DevOpsGatewaySettings;
  enterprise: EnterpriseGatewaySettings;
  datacenter: DataCenterGatewaySettings;
  agent_connection: AgentConnectionSettings;
  updated_at: string;
}

export interface UpdateSettingsRequest {
  devops: DevOpsGatewaySettings;
  enterprise: EnterpriseGatewaySettings;
  datacenter: DataCenterGatewaySettings;
  agent_connection: AgentConnectionSettings;
}

export interface AgentConnectionSettings {
  active: boolean;
  connected: boolean;
  integration_name: string;
  agent_id: string;
  autonomous: boolean;
  github_repo: string;
  github_copilot_enabled: boolean;
  azure_mcp_endpoint: string;
  azure_mcp_connected: boolean;
}

export interface TenantsResponse {
  tenants: string[];
}
