"use client";

import { FormEvent, useMemo, useState } from "react";

import { ProposedActionPayload } from "@/lib/types";

type ProposedActionFormProps = {
  isLoading: boolean;
  onSubmit: (payload: ProposedActionPayload) => Promise<void>;
};

const promptTemplates = [
  {
    label: "Destructive prompt",
    actionType: "agent_command_review",
    prompt:
      "Agent received a prompt to disable authentication and apply the change directly to production.",
    command: "disable-auth --env prod --apply",
    risk: "high" as const
  },
  {
    label: "Suspicious data access",
    actionType: "agent_command_review",
    prompt:
      "Agent was asked to export customer records to an external endpoint for offline analysis.",
    command: "export-customers --target external-bucket",
    risk: "high" as const
  },
  {
    label: "Routine safe operation",
    actionType: "agent_command_review",
    prompt:
      "Agent received a request to summarize last night’s deployment logs for the ops channel.",
    command: "summarize-logs --window 12h",
    risk: "low" as const
  }
];

export default function ProposedActionForm({
  isLoading,
  onSubmit
}: ProposedActionFormProps) {
  const [actionType, setActionType] = useState("agent_command_review");
  const [promptSummary, setPromptSummary] = useState(
    "Agent received a prompt to deploy a hotfix with elevated permissions."
  );
  const [agentCommand, setAgentCommand] = useState("deploy hotfix-service --env prod --elevated");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("high");
  const [integration, setIntegration] = useState("clawbot");
  const [agentId, setAgentId] = useState("agent-main");
  const [environment, setEnvironment] = useState("prod");
  const [autonomous, setAutonomous] = useState(true);
  const [blockApiTarget, setBlockApiTarget] = useState(
    "https://agent-control.example.com/api/block-command"
  );
  const [enforcementMode, setEnforcementMode] = useState<"block" | "review" | "shadow">("block");

  const queueSummary = useMemo(
    () => [
      { label: "Source", value: integration || "unassigned" },
      { label: "Agent", value: agentId || "unknown" },
      { label: "Mode", value: enforcementMode },
      { label: "Target", value: environment }
    ],
    [agentId, enforcementMode, environment, integration]
  );

  const applyTemplate = (index: number) => {
    const template = promptTemplates[index];
    if (!template) return;
    setActionType(template.actionType);
    setPromptSummary(template.prompt);
    setAgentCommand(template.command);
    setRiskLevel(template.risk);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      action_type: actionType.trim(),
      description: `Prompt observed: ${promptSummary.trim()}\nCommand under review: ${agentCommand.trim()}`,
      risk_level: riskLevel,
      metadata: {
        submitted_from: "decision-review-console",
        review_mode: "agent_advisory_window",
        integration: integration.trim() || "unknown",
        agent_id: agentId.trim() || "unknown-agent",
        command: agentCommand.trim(),
        prompt_summary: promptSummary.trim(),
        autonomous,
        environment,
        enforcement_mode: enforcementMode,
        block_api_target: blockApiTarget.trim()
      }
    });
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Agent Command Monitor
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
            Review prompts received by bots before they execute commands.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            This panel is now for monitored agent behavior only. Capture the incoming prompt,
            inspect the command it produced, and send the decision engine enough context to advise
            or block through your linked enforcement API.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100">
          <p className="font-semibold uppercase tracking-[0.16em]">Purpose</p>
          <p className="mt-2 max-w-[260px] leading-6">
            Monitor prompt-driven bot actions, assess the command, and decide whether the block
            API should be called.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {promptTemplates.map((template, index) => (
          <button
            key={template.label}
            type="button"
            onClick={() => applyTemplate(index)}
            className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-left transition-all hover:border-cyan-400/35 hover:bg-slate-900/80"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              {template.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{template.prompt}</p>
          </button>
        ))}
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <label
              htmlFor="promptSummary"
              className="block text-xs uppercase tracking-[0.12em] text-slate-300"
            >
              Prompt Received By The Agent
              <textarea
                id="promptSummary"
                value={promptSummary}
                onChange={(event) => setPromptSummary(event.target.value)}
                required
                rows={5}
                className="mt-1 w-full resize-none rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
              />
            </label>

            <label
              htmlFor="agentCommand"
              className="block text-xs uppercase tracking-[0.12em] text-slate-300"
            >
              Command Or Tool Call Produced
              <textarea
                id="agentCommand"
                value={agentCommand}
                onChange={(event) => setAgentCommand(event.target.value)}
                required
                rows={4}
                className="mt-1 w-full resize-none rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300/60"
              />
            </label>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Advisory Queue Snapshot
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {queueSummary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-semibold uppercase tracking-[0.14em]">Decision Use</p>
              <p className="mt-2 leading-6">
                `BLOCK` should feed the enforcement API target. `REVISE` should pause the bot for
                human review. `APPROVE` should release the command.
              </p>
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label
            htmlFor="actionType"
            className="block text-xs uppercase tracking-[0.12em] text-slate-300"
          >
            Review Type
            <input
              id="actionType"
              value={actionType}
              onChange={(event) => setActionType(event.target.value)}
              required
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            />
          </label>

          <label
            htmlFor="integration"
            className="block text-xs uppercase tracking-[0.12em] text-slate-300"
          >
            Bot Source
            <input
              id="integration"
              value={integration}
              onChange={(event) => setIntegration(event.target.value)}
              placeholder="clawbot, vscode-copilot, pipeline-bot"
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            />
          </label>

          <label
            htmlFor="agentId"
            className="block text-xs uppercase tracking-[0.12em] text-slate-300"
          >
            Agent ID
            <input
              id="agentId"
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            />
          </label>

          <label
            htmlFor="riskLevel"
            className="block text-xs uppercase tracking-[0.12em] text-slate-300"
          >
            Risk Estimate
            <select
              id="riskLevel"
              value={riskLevel}
              onChange={(event) => setRiskLevel(event.target.value as "low" | "medium" | "high")}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[0.8fr_0.8fr_1.4fr]">
          <label
            htmlFor="environment"
            className="block text-xs uppercase tracking-[0.12em] text-slate-300"
          >
            Target Environment
            <select
              id="environment"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            >
              <option value="prod">prod</option>
              <option value="staging">staging</option>
              <option value="dev">dev</option>
            </select>
          </label>

          <label
            htmlFor="enforcementMode"
            className="block text-xs uppercase tracking-[0.12em] text-slate-300"
          >
            Enforcement Mode
            <select
              id="enforcementMode"
              value={enforcementMode}
              onChange={(event) =>
                setEnforcementMode(event.target.value as "block" | "review" | "shadow")
              }
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            >
              <option value="block">block</option>
              <option value="review">review</option>
              <option value="shadow">shadow</option>
            </select>
          </label>

          <label
            htmlFor="blockApiTarget"
            className="block text-xs uppercase tracking-[0.12em] text-slate-300"
          >
            Block API Target
            <input
              id="blockApiTarget"
              value={blockApiTarget}
              onChange={(event) => setBlockApiTarget(event.target.value)}
              placeholder="https://agent-control.example.com/api/block-command"
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            />
          </label>
        </div>

        <label
          htmlFor="autonomous"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs uppercase tracking-[0.12em] text-slate-200"
        >
          <input
            id="autonomous"
            type="checkbox"
            checked={autonomous}
            onChange={(event) => setAutonomous(event.target.checked)}
            className="h-4 w-4"
          />
          Autonomous agent command
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className={[
            "w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-4 py-3 text-sm",
            "font-semibold uppercase tracking-[0.14em] text-white shadow-lg shadow-cyan-900/30",
            "transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50",
            isLoading ? "animate-pulse" : ""
          ].join(" ")}
        >
          {isLoading ? "Reviewing Agent Command..." : "Send To Advisory Review"}
        </button>
      </form>
    </section>
  );
}
