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
  audit_id: string;
  trace_id?: string;
  agent_trace?: AgentTrace;
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
  updated_at: string;
}

export interface UpdateSettingsRequest {
  devops: DevOpsGatewaySettings;
  enterprise: EnterpriseGatewaySettings;
  datacenter: DataCenterGatewaySettings;
}

export interface TenantsResponse {
  tenants: string[];
}
