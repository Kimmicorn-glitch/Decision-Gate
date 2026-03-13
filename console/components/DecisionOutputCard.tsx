"use client";

import { useMemo, useState } from "react";

import { DecisionResponse, PolicyViolationObject } from "@/lib/types";

type DecisionOutputCardProps = {
  result: DecisionResponse | null;
};

function normalizeViolations(
  violations: DecisionResponse["policy_violations"]
): string[] {
  if (!violations || violations.length === 0) return [];
  if (typeof violations[0] === "string") return violations as string[];
  return (violations as PolicyViolationObject[]).map(
    (v) => `${v.policy_id} [${v.severity}]: ${v.message}`
  );
}

export default function DecisionOutputCard({ result }: DecisionOutputCardProps) {
  const [traceOpen, setTraceOpen] = useState(false);

  const decisionStyle = useMemo(() => {
    if (!result) return "border-white/10 text-slate-100 bg-white/5 shadow-black/20";
    if (result.decision === "APPROVE") {
      return "bg-emerald-500/10 border-emerald-400/40 text-emerald-200 shadow-emerald-500/20";
    }
    if (result.decision === "REVISE") {
      return "bg-amber-500/10 border-amber-400/40 text-amber-200 shadow-amber-500/20";
    }
    return "bg-red-500/10 border-red-400/40 text-red-200 shadow-red-500/20";
  }, [result]);

  const violations = result ? normalizeViolations(result.policy_violations) : [];
  const trace = result?.agent_trace ?? {
    planner: ["Action decomposed into deterministic execution tasks."],
    execution: ["Technical preflight completed with risk signal classification."],
    governance: [
      violations.length > 0
        ? `${violations.length} policy trigger(s) matched configured controls.`
        : "No policy trigger activated."
    ],
    critic: ["Cross-agent consistency check completed before final decision."]
  };

  const copyAuditId = async () => {
    if (!result?.audit_id) return;
    await navigator.clipboard.writeText(result.audit_id);
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
            Advisory Window
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
            Command review outcome
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
          Review guidance for operators before bot execution
        </div>
      </div>

      {!result && (
        <p className="text-sm leading-7 text-slate-400">
          No advisory yet. Submit a monitored prompt and command pair to see whether the bot
          should proceed, pause for review, or be blocked through the enforcement API.
        </p>
      )}

      {result && (
        <div className="space-y-4 text-sm text-slate-100">
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-xl font-semibold tracking-[0.12em] shadow-xl transition-all duration-700",
              decisionStyle
            ].join(" ")}
          >
            {result.decision}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-300">
              Operator Recommendation
            </p>
            <p>
              {result.decision === "BLOCK"
                ? "Call the linked block endpoint and stop the bot command."
                : result.decision === "REVISE"
                  ? "Hold execution and route the command to a human reviewer."
                  : "Allow execution, but keep the audit trail attached to the bot event."}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-300">Reasoning</p>
            <p>{result.reasoning}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-300">Policy Violations</p>
            {violations.length === 0 ? (
              <p className="text-slate-400">None</p>
            ) : (
              <ul className="space-y-1">
                {violations.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Confidence</p>
              <p>{Math.round(result.confidence_score * 100)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Audit ID</p>
              <div className="flex items-center gap-2">
                <p className="truncate">{result.audit_id}</p>
                <button
                  type="button"
                  onClick={copyAuditId}
                  className="rounded-xl border border-white/15 px-2 py-1 text-xs text-slate-300 hover:border-blue-300/40 hover:text-slate-100"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {result.risk_assessment && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                Threat Signals
              </p>
              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-xs text-slate-200">
                <p>Overall Risk: {Math.round(result.risk_assessment.overall_risk_score * 100)}%</p>
                <p>
                  Prompt Injection Risk:{" "}
                  {Math.round(result.risk_assessment.prompt_injection_risk_score * 100)}%
                </p>
                <p>
                  Output Safety Risk:{" "}
                  {Math.round(result.risk_assessment.output_safety_risk_score * 100)}%
                </p>
                <p>
                  Token Waste Risk:{" "}
                  {Math.round(result.risk_assessment.token_waste_risk_score * 100)}%
                </p>
                <p>Estimated Tokens: {result.risk_assessment.estimated_tokens}</p>
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setTraceOpen((prev) => !prev)}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 hover:border-blue-300/40"
            >
              {traceOpen ? "Hide Agent Trace" : "Show Agent Trace"}
            </button>

            <div
              className={[
                "mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/50 transition-all duration-500",
                traceOpen ? "max-h-[520px] p-4" : "max-h-0 p-0 border-transparent"
              ].join(" ")}
            >
              <div className="space-y-3 text-xs text-slate-200">
                <TraceStage title="Planner" entries={trace.planner} />
                <TraceStage title="Execution" entries={trace.execution} />
                <TraceStage title="Governance" entries={trace.governance} />
                <TraceStage title="Critic" entries={trace.critic} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TraceStage({ title, entries }: { title: string; entries: string[] }) {
  return (
    <div>
      <p className="mb-1 uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={`${title}-${entry}`} className="rounded-lg border border-white/10 px-2 py-1.5">
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
}
