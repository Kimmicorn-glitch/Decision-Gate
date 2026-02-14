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
