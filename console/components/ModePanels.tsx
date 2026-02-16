"use client";

import { ReactNode } from "react";

import {
  ConsoleMode,
  firewallEvents,
  modelUsage,
  policies,
  registry
} from "@/lib/controlData";

type ModePanelsProps = {
  mode: ConsoleMode;
};

export default function ModePanels({ mode }: ModePanelsProps) {
  const framing = {
    DEVOPS: "Pipeline-first risk evaluation, pre-merge policy checks, deployment gating.",
    ENTERPRISE: "Org-wide agent oversight, auditability, compliance, and governance posture.",
    DATACENTER: "Region-level execution firewalling, privilege controls, and infra enforcement."
  }[mode];

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-blue-300/25 bg-blue-500/10 px-4 py-3 text-xs uppercase tracking-[0.14em] text-blue-100">
        {mode} Mode · {framing}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card id="agents" title="Connected Agents Registry">
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="text-slate-400">
            <tr>
              <th>Agent</th>
              <th>Env</th>
              <th>Status</th>
              <th>Decision</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {registry.map((item) => (
              <tr key={item.agent_id} className="border-t border-white/10">
                <td className="py-2">{item.agent_id}</td>
                <td>{item.environment}</td>
                <td>{item.status}</td>
                <td>{item.last_decision}</td>
                <td>{item.risk_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {(mode === "DEVOPS" || mode === "DATACENTER") && (
        <Card title="Execution Firewall Panel">
          <ul className="space-y-2 text-xs text-slate-200">
            {firewallEvents.map((event) => (
              <li
                key={`${event.timestamp}-${event.region}`}
                className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2"
              >
                <p className="font-semibold">
                  {event.region} · {event.result.toUpperCase()}
                </p>
                <p className="text-slate-400">{event.action}</p>
                <p className="text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(mode === "ENTERPRISE" || mode === "DATACENTER") && (
        <Card title="Model Router Visibility">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="text-slate-400">
              <tr>
                <th>Model</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              {modelUsage.map((item) => (
                <tr key={item.model} className="border-t border-white/10">
                  <td className="py-2">{item.model}</td>
                  <td>{item.tokens.toLocaleString()}</td>
                  <td>${item.est_cost_usd.toFixed(2)}</td>
                  <td>{Math.round(item.confidence_variance * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card id="integrations" title="Integrations">
        <ul className="space-y-2 text-xs text-slate-200">
          {mode === "DEVOPS" && (
            <>
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                GitHub Actions decision step: <span className="text-slate-400">connected</span>
              </li>
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                Azure DevOps gate extension: <span className="text-slate-400">connected</span>
              </li>
            </>
          )}
          {mode === "ENTERPRISE" && (
            <>
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                Compliance export pipeline: <span className="text-slate-400">enabled</span>
              </li>
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                Responsible AI audit sink: <span className="text-slate-400">enabled</span>
              </li>
            </>
          )}
          {mode === "DATACENTER" && (
            <>
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                Kubernetes admission webhook: <span className="text-slate-400">online</span>
              </li>
              <li className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                API gateway enforcement hook: <span className="text-slate-400">online</span>
              </li>
            </>
          )}
        </ul>
      </Card>

      <Card id="settings" title="Settings">
        <div className="space-y-2 text-xs text-slate-200">
          <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
            Policy simulation mode: <span className="text-slate-400">off</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
            Privilege escalation auto-block: <span className="text-slate-400">on</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
            Region fail-open behavior: <span className="text-slate-400">disabled</span>
          </div>
        </div>
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
