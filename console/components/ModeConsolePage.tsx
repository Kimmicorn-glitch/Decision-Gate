"use client";

import { useEffect, useRef, useState } from "react";

import { SideNav, TopControlBar } from "@/components/ControlFrame";
import DecisionOutputCard from "@/components/DecisionOutputCard";
import GateVisualization from "@/components/GateVisualization";
import Header from "@/components/Header";
import ModePanels from "@/components/ModePanels";
import ProposedActionForm from "@/components/ProposedActionForm";
import Toast from "@/components/Toast";
import { submitProposedAction } from "@/lib/api";
import { ConsoleMode } from "@/lib/controlData";
import { DecisionResponse, ProposedActionPayload } from "@/lib/types";

const stageCount = 4;

type ModeConsolePageProps = {
  mode: ConsoleMode;
};

export default function ModeConsolePage({ mode }: ModeConsolePageProps) {
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
      const isCopilotIntegration =
        integration.includes("copilot") || integration.includes("vscode");
      const risk = response.risk_assessment?.overall_risk_score ?? 0;
      const hasPolicyViolations = (response.policy_violations?.length ?? 0) > 0;

      if (isCopilotIntegration && (response.decision === "BLOCK" || risk >= 0.65)) {
        const message = `Copilot task flagged: ${response.decision}. Risk ${Math.round(
          risk * 100
        )}%. Review before applying changes.`;
        setNoticeVariant("warning");
        setNotice(message);
        notifyBrowser(message);
      } else if (isCopilotIntegration && hasPolicyViolations) {
        const message = `Copilot task requires revision due to policy checks.`;
        setNoticeVariant("info");
        setNotice(message);
        notifyBrowser(message);
      } else if (isCopilotIntegration) {
        const message = `Copilot task passed gate checks.`;
        setNoticeVariant("success");
        setNotice(message);
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
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
        <Header />
        <TopControlBar mode={mode} />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr]">
          <SideNav />

          <div className="space-y-4" id="dashboard">
            <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.05fr_1fr_1.15fr]">
              <ProposedActionForm isLoading={isLoading} onSubmit={handleSubmit} />
              <GateVisualization isLoading={isLoading} activeStage={activeStage} />
              <DecisionOutputCard result={result} />
            </section>

            <ModePanels mode={mode} />
          </div>
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
  );
}

function notifyBrowser(message: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification("Decision Gate Alert", { body: message });
    return;
  }
  if (Notification.permission === "default") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Decision Gate Alert", { body: message });
      }
    });
  }
}
