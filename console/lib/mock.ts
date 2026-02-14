import { AuditRecord } from "@/lib/types";

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
