import { DecisionType } from "@/lib/types";

export type ConsoleMode = "DEVOPS" | "ENTERPRISE" | "DATACENTER";

export type AgentRegistryItem = {
  agent_id: string;
  environment: "dev" | "staging" | "prod";
  status: "healthy" | "degraded" | "blocked";
  last_decision: DecisionType;
  risk_level: "low" | "medium" | "high";
};

export type PolicyItem = {
  id: string;
  severity: "critical" | "high" | "medium";
  threshold: string;
  active: boolean;
};

export type FirewallEvent = {
  timestamp: string;
  region: string;
  action: string;
  result: "blocked" | "revised";
};

export type ModelUsage = {
  model: string;
  tokens: number;
  est_cost_usd: number;
  confidence_variance: number;
};

export const registry: AgentRegistryItem[] = [
  {
    agent_id: "planner-main-prod",
    environment: "prod",
    status: "healthy",
    last_decision: "REVISE",
    risk_level: "medium"
  },
  {
    agent_id: "governance-eu-prod",
    environment: "prod",
    status: "healthy",
    last_decision: "BLOCK",
    risk_level: "high"
  },
  {
    agent_id: "execution-westus-stg",
    environment: "staging",
    status: "degraded",
    last_decision: "APPROVE",
    risk_level: "low"
  }
];

export const policies: PolicyItem[] = [
  { id: "POL-PRIV-001", severity: "critical", threshold: "no elevated prod deploy", active: true },
  { id: "POL-RISK-002", severity: "high", threshold: "risk_level != high", active: true },
  { id: "POL-COST-007", severity: "medium", threshold: "cost cap <= $200/day", active: true }
];

export const firewallEvents: FirewallEvent[] = [
  {
    timestamp: "2026-02-14T18:01:00Z",
    region: "eu-west",
    action: "deploy with elevated permissions",
    result: "blocked"
  },
  {
    timestamp: "2026-02-14T17:44:00Z",
    region: "eastus",
    action: "cross-region model execution",
    result: "revised"
  }
];

export const modelUsage: ModelUsage[] = [
  { model: "gpt-4.1", tokens: 18420, est_cost_usd: 12.8, confidence_variance: 0.08 },
  { model: "o4-mini", tokens: 41290, est_cost_usd: 6.1, confidence_variance: 0.12 },
  { model: "gpt-4.1-mini", tokens: 22950, est_cost_usd: 3.2, confidence_variance: 0.05 }
];
