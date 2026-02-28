"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import { fetchMonitorOverview, fetchRegisteredIntegrations } from "@/lib/api";
import { IntegrationRegistration, MonitorOverviewResponse } from "@/lib/types";

export default function BotsDashboardPage() {
  const [overview, setOverview] = useState<MonitorOverviewResponse | null>(null);
  const [registered, setRegistered] = useState<IntegrationRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [overviewRes, registeredRes] = await Promise.all([
        fetchMonitorOverview(),
        fetchRegisteredIntegrations().catch(() => [])
      ]);
      if (!mounted) return;
      setOverview(overviewRes);
      setRegistered(registeredRes);
      setLoading(false);
    };

    void load();
    const interval = setInterval(load, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const integrations = overview?.integrations ?? [];
  const integrationTypes = useMemo(
    () => ["ALL", ...Array.from(new Set(integrations.map((i) => i.integration_type.toUpperCase())))],
    [integrations]
  );
  const filtered = integrations.filter(
    (item) => typeFilter === "ALL" || item.integration_type.toUpperCase() === typeFilter
  );

  const copilotRows = filtered.filter((item) =>
    item.integration.toLowerCase().includes("copilot") ||
    item.integration.toLowerCase().includes("vscode")
  );

  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
        <Header />

        <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">
              Bot Tracking Dashboard
            </h1>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-white/15 bg-slate-950/70 px-2 py-1 text-xs text-slate-200"
            >
              {integrationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Link
              href="/settings"
              className="rounded-xl border border-blue-300/30 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-blue-100"
            >
              Link/Configure Bots
            </Link>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Metric label="Tracked Integrations" value={integrations.length} loading={loading} />
          <Metric
            label="Autonomous Bots"
            value={integrations.filter((i) => i.autonomous).length}
            loading={loading}
          />
          <Metric
            label="Blocked Decisions"
            value={overview?.decisions.block ?? 0}
            loading={loading}
          />
          <Metric
            label="Copilot/VSCode Bots"
            value={integrations.filter((i) => i.integration.toLowerCase().includes("copilot") || i.integration.toLowerCase().includes("vscode")).length}
            loading={loading}
          />
        </section>

        <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Copilot / VS Code Bot Watch">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="text-slate-400">
                <tr>
                  <th>Integration</th>
                  <th>Status</th>
                  <th>Req</th>
                  <th>Blocked</th>
                  <th>Autonomous</th>
                </tr>
              </thead>
              <tbody>
                {copilotRows.map((row) => (
                  <tr key={row.integration} className="border-t border-white/10">
                    <td className="py-2">{row.integration}</td>
                    <td>{row.status}</td>
                    <td>{row.request_count}</td>
                    <td>{row.blocked_count}</td>
                    <td>{row.autonomous ? "yes" : "no"}</td>
                  </tr>
                ))}
                {!loading && copilotRows.length === 0 && (
                  <tr className="border-t border-white/10">
                    <td className="py-2 text-slate-400" colSpan={5}>
                      No Copilot/VSCode bot traffic yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Runtime Health">
            <div className="space-y-2 text-xs text-slate-200">
              <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                CPU Usage: {Math.round(overview?.runtime_metrics?.cpu_usage_percent ?? 0)}%
              </p>
              <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                Memory: {Math.round(overview?.runtime_metrics?.memory_usage_mb ?? 0)} MB
              </p>
              <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                Processes: {overview?.runtime_metrics?.process_count ?? 0}
              </p>
              <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                Last sample:{" "}
                {overview?.runtime_metrics?.updated_at
                  ? new Date(overview.runtime_metrics.updated_at).toLocaleString()
                  : "n/a"}
              </p>
            </div>
          </Panel>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="All Monitored Bots">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="text-slate-400">
                <tr>
                  <th>Bot/Integration</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Req</th>
                  <th>Blocked</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.integration} className="border-t border-white/10">
                    <td className="py-2">{row.integration}</td>
                    <td>{row.integration_type}</td>
                    <td>{row.status}</td>
                    <td>{row.request_count}</td>
                    <td>{row.blocked_count}</td>
                    <td>{new Date(row.last_seen).toLocaleString()}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr className="border-t border-white/10">
                    <td className="py-2 text-slate-400" colSpan={6}>
                      No bot traffic for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Registered Connections">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="text-slate-400">
                <tr>
                  <th>Integration</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {registered.map((item) => (
                  <tr key={`${item.integration}-${item.updated_at}`} className="border-t border-white/10">
                    <td className="py-2">{item.integration}</td>
                    <td>{item.integration_type}</td>
                    <td>{item.owner}</td>
                    <td>{item.status}</td>
                    <td>{new Date(item.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!loading && registered.length === 0 && (
                  <tr className="border-t border-white/10">
                    <td className="py-2 text-slate-400" colSpan={5}>
                      No explicit bot links registered yet. Use Settings.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>
        </section>

        <Panel title="Recent High-Risk Bot Events">
          <ul className="space-y-2 text-xs text-slate-200">
            {(overview?.recent_high_risk_events ?? []).map((event) => (
              <li key={event.audit_id} className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                <p className="font-semibold">
                  {event.integration} · {event.action_type} · {event.decision}
                </p>
                <p className="text-slate-400">Risk: {Math.round(event.overall_risk_score * 100)}%</p>
                <p className="text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
              </li>
            ))}
            {!loading && (overview?.recent_high_risk_events.length ?? 0) === 0 && (
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-slate-400">
                No high-risk events yet.
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">
        {loading ? "..." : value.toLocaleString()}
      </p>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
        {title}
      </h2>
      {children}
    </section>
  );
}
