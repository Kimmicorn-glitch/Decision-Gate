"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

import { fetchMonitorOverview } from "@/lib/api";
import { ConsoleMode, policies } from "@/lib/controlData";
import { MonitorOverviewResponse } from "@/lib/types";

type ModePanelsProps = {
  mode: ConsoleMode;
};

export default function ModePanels({ mode }: ModePanelsProps) {
  const [overview, setOverview] = useState<MonitorOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await fetchMonitorOverview();
      if (!mounted) return;
      setOverview(data);
      setLoading(false);
    };

    void load();
    const interval = setInterval(load, 8000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const framing = {
    DEVOPS: "Pipeline-first risk evaluation, pre-merge policy checks, deployment gating.",
    ENTERPRISE: "Org-wide agent oversight, auditability, compliance, and governance posture.",
    DATACENTER: "Region-level execution firewalling, privilege controls, and infra enforcement."
  }[mode];

  const autonomousCount = useMemo(
    () => overview?.integrations.filter((item) => item.autonomous).length ?? 0,
    [overview]
  );

  return (
    <section className="space-y-3" aria-live="polite">
      <div className="rounded-2xl border border-blue-300/25 bg-blue-500/10 px-4 py-3 text-xs uppercase tracking-[0.14em] text-blue-100">
        {mode} Mode · {framing}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <MetricCard label="Total Requests" value={overview?.decisions.total ?? 0} loading={loading} />
        <MetricCard label="Blocked" value={overview?.decisions.block ?? 0} loading={loading} />
        <MetricCard label="Patch Actions" value={overview?.decisions.patch_actions ?? 0} loading={loading} />
        <MetricCard label="Autonomous Links" value={autonomousCount} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricCard
          label="CPU Usage %"
          value={Math.round(overview?.runtime_metrics?.cpu_usage_percent ?? 0)}
          loading={loading}
        />
        <MetricCard
          label="Memory MB"
          value={Math.round(overview?.runtime_metrics?.memory_usage_mb ?? 0)}
          loading={loading}
        />
        <MetricCard
          label="Process Count"
          value={overview?.runtime_metrics?.process_count ?? 0}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card id="agents" title="Connected Integrations">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <caption className="sr-only">Connected agent, IDE, DevOps, and enterprise integrations</caption>
              <thead className="text-slate-400">
                <tr>
                  <th scope="col">Integration</th>
                  <th scope="col">Type</th>
                  <th scope="col">Autonomous</th>
                  <th scope="col">Status</th>
                  <th scope="col">Req</th>
                  <th scope="col">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.integrations ?? []).map((item) => (
                  <tr key={item.integration} className="border-t border-white/10">
                    <th scope="row" className="py-2 font-medium">{item.integration}</th>
                    <td>{item.integration_type}</td>
                    <td>{item.autonomous ? "yes" : "no"}</td>
                    <td>{item.status}</td>
                    <td>{item.request_count}</td>
                    <td>{item.blocked_count}</td>
                  </tr>
                ))}
                {!loading && (overview?.integrations.length ?? 0) === 0 && (
                  <tr className="border-t border-white/10">
                    <td colSpan={6} className="py-2 text-slate-400">No integration traffic yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card id="policies" title="Policy Engine View">
          <ul className="space-y-2 text-xs text-slate-200">
            {policies.map((item) => (
              <li key={item.id} className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                <p className="font-semibold">{item.id}</p>
                <p className="text-slate-400">Severity: {item.severity}</p>
                <p className="text-slate-400">Threshold: {item.threshold}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card id="integrations" title="Prompt/Output/Token Risk">
          <div className="space-y-2 text-xs text-slate-200">
            <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
              Prompt injection flagged: {overview?.risks.prompt_injection_flagged ?? 0}
            </p>
            <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
              Output safety flagged: {overview?.risks.output_safety_flagged ?? 0}
            </p>
            <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
              Token waste flagged: {overview?.risks.token_waste_flagged ?? 0}
            </p>
            <p className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
              Avg estimated tokens: {overview?.risks.avg_estimated_tokens ?? 0}
            </p>
          </div>
        </Card>

        <Card id="settings" title="Recent High-Risk Events">
          <ul className="space-y-2 text-xs text-slate-200">
            {(overview?.recent_high_risk_events ?? []).map((event) => (
              <li key={event.audit_id} className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                <p className="font-semibold">
                  {event.action_type} · {event.decision}
                </p>
                <p className="text-slate-400">integration: {event.integration}</p>
                <p className="text-slate-400">risk: {Math.round(event.overall_risk_score * 100)}%</p>
                <p className="text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
              </li>
            ))}
            {!loading && (overview?.recent_high_risk_events.length ?? 0) === 0 && (
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-slate-400">
                No high-risk events yet.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function Card({
  id,
  title,
  children
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article
      id={id}
      className="scroll-mt-28 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl"
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{title}</h3>
      {children}
    </article>
  );
}

function MetricCard({
  label,
  value,
  loading
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{loading ? "..." : value.toLocaleString()}</p>
    </article>
  );
}
