"use client";

import { FormEvent, useState } from "react";

import { ProposedActionPayload } from "@/lib/types";

type ProposedActionFormProps = {
  isLoading: boolean;
  onSubmit: (payload: ProposedActionPayload) => Promise<void>;
};

export default function ProposedActionForm({
  isLoading,
  onSubmit
}: ProposedActionFormProps) {
  const [actionType, setActionType] = useState("deploy");
  const [description, setDescription] = useState(
    "Deploy service X to production with elevated permissions."
  );
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("high");
  const [integration, setIntegration] = useState("clawbot");
  const [autonomous, setAutonomous] = useState(true);
  const [environment, setEnvironment] = useState("prod");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      action_type: actionType.trim(),
      description: description.trim(),
      risk_level: riskLevel,
      metadata: {
        submitted_from: "decision-review-console",
        integration: integration.trim() || "unknown",
        autonomous,
        environment
      }
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
        Proposed Action
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label htmlFor="actionType" className="block text-xs uppercase tracking-[0.12em] text-slate-300">
          Action Type
          <input
            id="actionType"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            required
            aria-required="true"
            className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
          />
        </label>

        <label htmlFor="description" className="block text-xs uppercase tracking-[0.12em] text-slate-300">
          Description
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            aria-required="true"
            rows={6}
            className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
          />
        </label>

        <label htmlFor="riskLevel" className="block text-xs uppercase tracking-[0.12em] text-slate-300">
          Risk Level
          <select
            id="riskLevel"
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as "low" | "medium" | "high")}
            className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label htmlFor="integration" className="block text-xs uppercase tracking-[0.12em] text-slate-300">
            Integration Source
            <input
              id="integration"
              value={integration}
              onChange={(e) => setIntegration(e.target.value)}
              placeholder="clawbot, github-actions, vscode"
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
            />
          </label>

          <label htmlFor="environment" className="block text-xs uppercase tracking-[0.12em] text-slate-300">
            Environment
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
            >
              <option value="prod">prod</option>
              <option value="staging">staging</option>
              <option value="dev">dev</option>
            </select>
          </label>
        </div>

        <label
          htmlFor="autonomous"
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-xs uppercase tracking-[0.12em] text-slate-200"
        >
          <input
            id="autonomous"
            type="checkbox"
            checked={autonomous}
            onChange={(e) => setAutonomous(e.target.checked)}
            className="h-4 w-4"
          />
          Autonomous Agent
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className={[
            "w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm",
            "font-semibold uppercase tracking-[0.12em] text-blue-50 shadow-lg shadow-blue-900/40",
            "transition-transform duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50",
            isLoading ? "animate-pulse" : ""
          ].join(" ")}
        >
          {isLoading ? "Evaluating..." : "Submit For Decision"}
        </button>
      </form>
    </section>
  );
}
