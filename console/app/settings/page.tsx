"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthGate from "@/components/AuthGate";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import {
  changePassword,
  fetchSettings,
  listTenants,
  registerIntegration,
  registerAdmin,
  requestPasswordReset,
  updateSettings
} from "@/lib/api";
import type { RegisterRequest } from "@/lib/types";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const router = useRouter();
  const token = "";
  const [role] = useState<"admin" | "operator" | "viewer">("admin");
  const username = "admin";
  const canWriteSettings = role === "admin" || role === "operator";
  const canManageUsers = role === "admin";

  const [tenants, setTenants] = useState<string[]>(["default"]);
  const [tenantId, setTenantId] = useState("default");

  const [devopsEndpoint, setDevopsEndpoint] = useState("");
  const [pipelineProvider, setPipelineProvider] = useState("github-actions");
  const [policySimulation, setPolicySimulation] = useState(true);

  const [enterpriseTenant, setEnterpriseTenant] = useState("");
  const [auditExportSink, setAuditExportSink] = useState("azure-monitor");
  const [raiLogs, setRaiLogs] = useState(true);

  const [regions, setRegions] = useState("");
  const [providers, setProviders] = useState("");
  const [backgroundEnforcement, setBackgroundEnforcement] = useState(true);
  const [blockHighRisk, setBlockHighRisk] = useState(true);
  const [blockCrossRegion, setBlockCrossRegion] = useState(true);
  const [costCap, setCostCap] = useState("5000");
  const [agentActive, setAgentActive] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [integrationName, setIntegrationName] = useState("clawbot");
  const [agentId, setAgentId] = useState("agent-main");
  const [agentAutonomous, setAgentAutonomous] = useState(true);
  const [githubRepo, setGithubRepo] = useState("owner/repo");
  const [githubCopilotEnabled, setGithubCopilotEnabled] = useState(true);
  const [azureMcpEndpoint, setAzureMcpEndpoint] = useState("");
  const [azureMcpConnected, setAzureMcpConnected] = useState(false);

  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState<RegisterRequest["role"]>("operator");

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNext, setPasswordNext] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [issuedResetToken, setIssuedResetToken] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    listTenants(token)
      .then((list) => {
        if (list.length > 0) {
          setTenants(list);
          setTenantId(list[0]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tenants"));
  }, [token]);

  useEffect(() => {
    if (!token || !tenantId) return;

    fetchSettings(token, tenantId)
      .then((settings) => {
        setDevopsEndpoint(settings.devops.endpoint);
        setPipelineProvider(settings.devops.pipeline_provider);
        setPolicySimulation(settings.devops.pre_merge_policy_simulation);

        setEnterpriseTenant(settings.enterprise.tenant);
        setAuditExportSink(settings.enterprise.audit_export_sink);
        setRaiLogs(settings.enterprise.responsible_ai_logs_enabled);

        setRegions(settings.datacenter.regions.join(", "));
        setProviders(settings.datacenter.ai_browser_providers.join(", "));
        setBackgroundEnforcement(settings.datacenter.background_enforcement);
        setBlockHighRisk(settings.datacenter.block_high_risk);
        setBlockCrossRegion(settings.datacenter.block_cross_region);
        setCostCap(String(settings.datacenter.monthly_cost_cap_usd));
        setAgentActive(settings.agent_connection.active);
        setAgentConnected(settings.agent_connection.connected);
        setIntegrationName(settings.agent_connection.integration_name);
        setAgentId(settings.agent_connection.agent_id);
        setAgentAutonomous(settings.agent_connection.autonomous);
        setGithubRepo(settings.agent_connection.github_repo);
        setGithubCopilotEnabled(settings.agent_connection.github_copilot_enabled);
        setAzureMcpEndpoint(settings.agent_connection.azure_mcp_endpoint);
        setAzureMcpConnected(settings.agent_connection.azure_mcp_connected);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"));
  }, [token, tenantId]);

  const onSaveSettings = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!canWriteSettings) {
      setError("Your role is read-only for gateway settings.");
      return;
    }

    try {
      await updateSettings(token, tenantId, {
        devops: {
          endpoint: devopsEndpoint.trim(),
          pipeline_provider: pipelineProvider.trim(),
          pre_merge_policy_simulation: policySimulation
        },
        enterprise: {
          tenant: enterpriseTenant.trim(),
          audit_export_sink: auditExportSink.trim(),
          responsible_ai_logs_enabled: raiLogs
        },
        datacenter: {
          regions: parseList(regions),
          ai_browser_providers: parseList(providers),
          background_enforcement: backgroundEnforcement,
          block_high_risk: blockHighRisk,
          block_cross_region: blockCrossRegion,
          monthly_cost_cap_usd: Number(costCap)
        },
        agent_connection: {
          active: agentActive,
          connected: agentConnected,
          integration_name: integrationName.trim(),
          agent_id: agentId.trim(),
          autonomous: agentAutonomous,
          github_repo: githubRepo.trim(),
          github_copilot_enabled: githubCopilotEnabled,
          azure_mcp_endpoint: azureMcpEndpoint.trim(),
          azure_mcp_connected: azureMcpConnected
        }
      });

      if (agentActive && agentConnected && integrationName.trim()) {
        await registerIntegration({
          integration: integrationName.trim(),
          integration_type: "agent",
          autonomous: agentAutonomous,
          environment: "prod",
          owner: username || "settings-user",
          status: "active"
        });
      }
      setNotice("Tenant settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  const onCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!canManageUsers) {
      setError("Only admin role can create users.");
      return;
    }

    try {
      await registerAdmin(token, { username: newUser, password: newPass, role: newRole });
      setNotice("User created.");
      setNewUser("");
      setNewPass("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      await changePassword(token, {
        current_password: passwordCurrent,
        new_password: passwordNext
      });
      setNotice("Password rotated.");
      setPasswordCurrent("");
      setPasswordNext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  const onIssueReset = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!canManageUsers) {
      setError("Only admin role can issue reset tokens.");
      return;
    }

    try {
      const response = await requestPasswordReset(token, { username: resetUsername });
      setIssuedResetToken(response.reset_token);
      setNotice(`Reset token issued for ${resetUsername}.`);
      setResetUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue reset token");
    }
  };

  const roleBadgeClass = useMemo(() => {
    if (role === "admin") return "text-emerald-300 border-emerald-400/30 bg-emerald-500/10";
    if (role === "operator") return "text-amber-300 border-amber-400/30 bg-amber-500/10";
    return "text-slate-300 border-slate-400/30 bg-slate-500/10";
  }, [role]);

  return (
    <AuthGate>
      <main className="grid-overlay min-h-screen">
        <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8">
          <Header />

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
              Gateway Settings
            </h2>
            <div className={`rounded-xl border px-3 py-1 text-xs uppercase tracking-[0.12em] ${roleBadgeClass}`}>
              {username || "unknown"} / {role}
            </div>
          </div>

          <label className="block text-xs uppercase tracking-[0.12em] text-slate-300">
            Tenant
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            >
              {tenants.map((tenant) => (
                <option key={tenant} value={tenant}>
                  {tenant}
                </option>
              ))}
            </select>
          </label>

          <form className="space-y-4" onSubmit={onSaveSettings}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              DevOps
            </h3>
            <input
              value={devopsEndpoint}
              onChange={(e) => setDevopsEndpoint(e.target.value)}
              placeholder="DevOps endpoint"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={pipelineProvider}
              onChange={(e) => setPipelineProvider(e.target.value)}
              placeholder="Pipeline provider"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={policySimulation}
                onChange={(e) => setPolicySimulation(e.target.checked)}
              />
              Pre-merge policy simulation
            </label>

            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Enterprise
            </h3>
            <input
              value={enterpriseTenant}
              onChange={(e) => setEnterpriseTenant(e.target.value)}
              placeholder="Enterprise tenant"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={auditExportSink}
              onChange={(e) => setAuditExportSink(e.target.value)}
              placeholder="Audit export sink"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={raiLogs} onChange={(e) => setRaiLogs(e.target.checked)} />
              Responsible AI logs enabled
            </label>

            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Data Center / AI Browser Guard
            </h3>
            <input
              value={regions}
              onChange={(e) => setRegions(e.target.value)}
              placeholder="Regions (comma-separated)"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={providers}
              onChange={(e) => setProviders(e.target.value)}
              placeholder="AI browser providers (comma-separated)"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="number"
              value={costCap}
              onChange={(e) => setCostCap(e.target.value)}
              placeholder="Monthly cost cap"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={backgroundEnforcement}
                onChange={(e) => setBackgroundEnforcement(e.target.checked)}
              />
              Background enforcement enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={blockHighRisk}
                onChange={(e) => setBlockHighRisk(e.target.checked)}
              />
              Block high risk actions by default
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={blockCrossRegion}
                onChange={(e) => setBlockCrossRegion(e.target.checked)}
              />
              Block cross-region execution
            </label>

            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Agent Link Settings
            </h3>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={agentActive}
                onChange={(e) => setAgentActive(e.target.checked)}
              />
              Gateway active for linked agent
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={agentConnected}
                onChange={(e) => setAgentConnected(e.target.checked)}
              />
              Agent connection verified
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={agentAutonomous}
                onChange={(e) => setAgentAutonomous(e.target.checked)}
              />
              Agent is autonomous
            </label>
            <input
              value={integrationName}
              onChange={(e) => setIntegrationName(e.target.value)}
              placeholder="Integration name (e.g. clawbot)"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="Agent ID"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="GitHub repo (owner/repo)"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={githubCopilotEnabled}
                onChange={(e) => setGithubCopilotEnabled(e.target.checked)}
              />
              GitHub Copilot integration enabled
            </label>
            <input
              value={azureMcpEndpoint}
              onChange={(e) => setAzureMcpEndpoint(e.target.value)}
              placeholder="Azure MCP endpoint"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={azureMcpConnected}
                onChange={(e) => setAzureMcpConnected(e.target.checked)}
              />
              Azure MCP connected
            </label>

            <button
              type="submit"
              disabled={!canWriteSettings}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Tenant Settings
            </button>
          </form>

          <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={onCreateUser}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              User Provisioning (RBAC)
            </h3>
            <input
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as RegisterRequest["role"])}
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            >
              <option value="admin">admin</option>
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
            </select>
            <button
              type="submit"
              disabled={!canManageUsers}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create User
            </button>
          </form>

          <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={onChangePassword}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Password Rotation
            </h3>
            <input
              type="password"
              value={passwordCurrent}
              onChange={(e) => setPasswordCurrent(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="password"
              value={passwordNext}
              onChange={(e) => setPasswordNext(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-blue-100"
            >
              Rotate Password
            </button>
          </form>

          <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={onIssueReset}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Password Reset (Admin)
            </h3>
            <input
              value={resetUsername}
              onChange={(e) => setResetUsername(e.target.value)}
              placeholder="Username to reset"
              className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="submit"
              disabled={!canManageUsers}
              className="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Issue Reset Token
            </button>
            {issuedResetToken && (
              <div className="rounded-xl border border-white/15 bg-slate-950/70 px-3 py-3 text-xs text-slate-200">
                Reset token: <span className="font-mono">{issuedResetToken}</span>
              </div>
            )}
          </form>
        </section>
        </div>

        {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
        {error && <Toast message={error} onDismiss={() => setError(null)} />}
      </main>
    </AuthGate>
  );
}
