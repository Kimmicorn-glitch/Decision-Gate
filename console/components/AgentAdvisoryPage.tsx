"use client";

import { useEffect, useRef, useState } from "react";

import AuthGate from "@/components/AuthGate";
import DecisionOutputCard from "@/components/DecisionOutputCard";
import GateVisualization from "@/components/GateVisualization";
import Header from "@/components/Header";
import ProposedActionForm from "@/components/ProposedActionForm";
import Toast from "@/components/Toast";
import { submitProposedAction } from "@/lib/api";
import { DecisionResponse, ProposedActionPayload } from "@/lib/types";

const stageCount = 4;

export default function AgentAdvisoryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeVariant, setNoticeVariant] = useState<"warning" | "info" | "success">("info");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startStageProgress = () => {
    setActiveStage(0);
    intervalRef.current = setInterval(() => {
      setActiveStage((prev) => Math.min(stageCount - 1, prev + 1));
    }, 600);
  };

  const stopStageProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveStage(stageCount - 1);
  };

  const handleSubmit = async (payload: ProposedActionPayload) => {
    try {
      setError(null);
      setResult(null);
      setIsLoading(true);
      startStageProgress();

      const response = await submitProposedAction(payload);
      stopStageProgress();
      setResult(response);

      const integration = String(payload.metadata.integration ?? "").toLowerCase();
      const risk = response.risk_assessment?.overall_risk_score ?? 0;
      const hasPolicyViolations = (response.policy_violations?.length ?? 0) > 0;

      if (response.decision === "BLOCK" || risk >= 0.65) {
        const message = `${integration || "Agent"} flagged ${response.decision}. Review the command before release.`;
        setNoticeVariant("warning");
        setNotice(message);
      } else if (hasPolicyViolations) {
        setNoticeVariant("info");
        setNotice("Advisory review returned policy signals that require operator action.");
      } else {
        setNoticeVariant("success");
        setNotice("Advisory review cleared the monitored command for release.");
      }
    } catch (err) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setActiveStage(-1);
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGate>
      <main className="grid-overlay min-h-screen">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
          <Header />

          <section className="mb-6 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,23,42,0.96))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Dedicated Review Surface
            </p>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
                  Agent advisory review and command blocking
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Use this page to inspect prompts received by monitored bots, review the command
                  they generated, and decide whether the enforcement API should release, pause, or
                  block the action.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs uppercase tracking-[0.14em] text-cyan-100">
                Linked to monitored agent behavior only
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.15fr_0.8fr_0.95fr]">
            <ProposedActionForm isLoading={isLoading} onSubmit={handleSubmit} />
            <GateVisualization isLoading={isLoading} activeStage={activeStage} />
            <DecisionOutputCard result={result} />
          </section>

          {error && <Toast message={error} onDismiss={() => setError(null)} />}
          {notice && (
            <Toast
              message={notice}
              variant={noticeVariant}
              onDismiss={() => setNotice(null)}
            />
          )}
        </div>
      </main>
    </AuthGate>
  );
}
