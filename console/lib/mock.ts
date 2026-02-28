import { AuditRecord, MonitorOverviewResponse } from "@/lib/types";

export const mockAuditRecords: AuditRecord[] = [
  {
    audit_id: "88b6ba8d-43de-447f-9f9b-1f6abf301ce5",
    timestamp: "2026-02-14T14:15:00Z",
    decision: "BLOCK",
    action_type: "deploy",
    confidence_score: 0.18
  },
  {
    audit_id: "f3114ffd-a4b6-4d2f-9dea-8ed2424dc72f",
    timestamp: "2026-02-14T13:52:00Z",
    decision: "REVISE",
    action_type: "scale",
    confidence_score: 0.63
  },
  {
    audit_id: "6db32b1a-4175-44f5-b50b-01272f74f535",
    timestamp: "2026-02-14T13:18:00Z",
    decision: "APPROVE",
    action_type: "patch",
    confidence_score: 0.91
  }
];

export const mockMonitorOverview: MonitorOverviewResponse = {
  generated_at: "2026-02-14T18:30:00Z",
  decisions: {
    total: 42,
    approve: 17,
    revise: 15,
    block: 10,
    patch_actions: 18
  },
  risks: {
    prompt_injection_flagged: 7,
    output_safety_flagged: 11,
    token_waste_flagged: 8,
    high_risk_total: 14,
    avg_estimated_tokens: 214
  },
  integrations: [
    {
      integration: "clawbot",
      integration_type: "agent",
      autonomous: true,
      status: "guarded",
      request_count: 12,
      blocked_count: 6,
      last_seen: "2026-02-14T18:29:00Z"
    },
    {
      integration: "github-actions",
      integration_type: "devops",
      autonomous: false,
      status: "watch",
      request_count: 16,
      blocked_count: 4,
      last_seen: "2026-02-14T18:26:00Z"
    },
    {
      integration: "vscode-extension",
      integration_type: "ide",
      autonomous: false,
      status: "healthy",
      request_count: 9,
      blocked_count: 0,
      last_seen: "2026-02-14T18:21:00Z"
    }
  ],
  recent_high_risk_events: [
    {
      audit_id: "f4f6f221-9fd2-4e6f-b893-244cab72200f",
      timestamp: "2026-02-14T18:25:00Z",
      action_type: "patch",
      decision: "BLOCK",
      overall_risk_score: 0.91,
      integration: "clawbot"
    },
    {
      audit_id: "d2893cb8-130d-4622-a302-177b0f67288e",
      timestamp: "2026-02-14T17:55:00Z",
      action_type: "deploy",
      decision: "REVISE",
      overall_risk_score: 0.7,
      integration: "github-actions"
    }
  ],
  runtime_metrics: {
    cpu_usage_percent: 32.4,
    memory_usage_mb: 742,
    process_count: 128,
    updated_at: "2026-02-14T18:30:00Z"
  }
};
