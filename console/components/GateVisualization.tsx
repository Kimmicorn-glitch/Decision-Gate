"use client";

const stages = ["Planner", "Execution", "Governance", "Critic"];

type GateVisualizationProps = {
  activeStage: number;
  isLoading: boolean;
};

export default function GateVisualization({
  activeStage,
  isLoading
}: GateVisualizationProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
        Monitoring Pipeline
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
        Prompt-to-command review path
      </h2>
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {stages.map((stage, idx) => {
          const isActive = idx === activeStage;
          const isCompleted = idx < activeStage;
          return (
            <div key={stage} className="flex items-center gap-2">
              <div
                className={[
                  "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.14em]",
                  "transition-all duration-500",
                  isActive
                    ? "border-blue-400/50 bg-blue-500/20 text-blue-200 shadow-[0_0_24px_rgba(59,130,246,0.35)] animate-pulse"
                    : isCompleted
                      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                      : "border-white/15 bg-white/5 text-slate-400"
                ].join(" ")}
              >
                {stage}
              </div>
              {idx < stages.length - 1 && <span className="text-slate-500">→</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
        {isLoading
          ? "The advisory engine is inspecting the prompt, command, risks, and policy triggers before deciding whether to block or release the bot action."
          : "Waiting for a monitored bot prompt. Use this space to review what the agent received and what it plans to do next."}
      </div>
    </section>
  );
}
