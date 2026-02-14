import { mockAuditRecords } from "@/lib/mock";
import {
  AuditRecord,
  AuditListResponse,
  DecisionResponse,
  ProposedActionPayload
} from "@/lib/types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_GATE_API_URL ||
  "http://localhost:8080";

export async function submitProposedAction(
  payload: ProposedActionPayload
): Promise<DecisionResponse> {
  const response = await fetch(`${baseUrl}/proposed-action`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Decision API failed with status ${response.status}`);
  }

  return (await response.json()) as DecisionResponse;
}

export async function fetchAuditLog(): Promise<AuditRecord[]> {
  try {
    const response = await fetch(`${baseUrl}/audit`, {
      method: "GET",
      headers: {
        "content-type": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Audit API failed with status ${response.status}`);
    }

    const parsed = (await response.json()) as AuditListResponse | AuditRecord[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return parsed.data;
  } catch {
    return mockAuditRecords;
  }
}
