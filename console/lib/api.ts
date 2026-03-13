import { mockAuditRecords, mockMonitorOverview } from "@/lib/mock";
import {
  AuditRecord,
  AuditListResponse,
  ChangePasswordRequest,
  DecisionResponse,
  IntegrationRegistration,
  IntegrationRegistrationRequest,
  IntegrationRegistryResponse,
  MonitorOverviewResponse,
  LoginRequest,
  LoginResponse,
  ProposedActionPayload,
  RegisterRequest,
  ResetPasswordIssueResponse,
  ResetPasswordRequest,
  TenantSettings,
  TenantsResponse,
  UpdateSettingsRequest
} from "@/lib/types";

function resolveApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_AGENT_GATE_API_URL;
  if (configured) return configured;

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  return "http://localhost:8080";
}

export async function submitProposedAction(
  payload: ProposedActionPayload
): Promise<DecisionResponse> {
  const baseUrl = resolveApiBaseUrl();
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
    const baseUrl = resolveApiBaseUrl();
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

export async function fetchMonitorOverview(): Promise<MonitorOverviewResponse> {
  try {
    const baseUrl = resolveApiBaseUrl();
    const response = await fetch(`${baseUrl}/monitor/overview`, {
      method: "GET",
      headers: {
        "content-type": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Monitor API failed with status ${response.status}`);
    }

    return (await response.json()) as MonitorOverviewResponse;
  } catch {
    return mockMonitorOverview;
  }
}

export async function registerIntegration(
  payload: IntegrationRegistrationRequest
): Promise<IntegrationRegistration> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/monitor/integrations`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Integration registration failed (${response.status}).`);
  }

  return (await response.json()) as IntegrationRegistration;
}

export async function fetchRegisteredIntegrations(): Promise<IntegrationRegistration[]> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/monitor/integrations`, {
    method: "GET",
    headers: {
      "content-type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Integration list failed (${response.status}).`);
  }

  const parsed = (await response.json()) as
    | IntegrationRegistryResponse
    | IntegrationRegistration[];
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return parsed.data;
}

export async function loginAdmin(payload: LoginRequest): Promise<LoginResponse> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Login failed. Check username/password format and credentials.");
  }
  return (await response.json()) as LoginResponse;
}

export async function registerAdmin(
  token: string,
  payload: RegisterRequest
): Promise<void> {
  const baseUrl = resolveApiBaseUrl();
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (token.trim()) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to create user (${response.status}).`);
  }
}

export async function listTenants(token: string): Promise<string[]> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/admin/tenants`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load tenant list.");
  }

  const body = (await response.json()) as TenantsResponse;
  return body.tenants;
}

export async function fetchSettings(
  token: string,
  tenantId: string
): Promise<TenantSettings> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/admin/settings/${tenantId}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load settings.");
  }
  return (await response.json()) as TenantSettings;
}

export async function updateSettings(
  token: string,
  tenantId: string,
  payload: UpdateSettingsRequest
): Promise<TenantSettings> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/admin/settings/${tenantId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Failed to update settings.");
  }
  return (await response.json()) as TenantSettings;
}

export async function changePassword(
  token: string,
  payload: ChangePasswordRequest
): Promise<void> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/change-password`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to change password (${response.status}).`);
  }
}

export async function requestPasswordReset(
  token: string,
  payload: ResetPasswordRequest
): Promise<ResetPasswordIssueResponse> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/reset-password/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to issue reset token (${response.status}).`);
  }
  return (await response.json()) as ResetPasswordIssueResponse;
}

export async function confirmPasswordReset(
  resetToken: string,
  newPassword: string
): Promise<void> {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/reset-password/confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      reset_token: resetToken,
      new_password: newPassword
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to confirm reset (${response.status}).`);
  }
}
