"use client";

import { useEffect, useRef, useState } from "react";

import DecisionOutputCard from "@/components/DecisionOutputCard";
import GateVisualization from "@/components/GateVisualization";
import Header from "@/components/Header";
import ProposedActionForm from "@/components/ProposedActionForm";
import Toast from "@/components/Toast";
import { submitProposedAction } from "@/lib/api";
import { DecisionResponse, ProposedActionPayload } from "@/lib/types";

const stageCount = 4;

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1fr_1.15fr]">
          <ProposedActionForm isLoading={isLoading} onSubmit={handleSubmit} />
          <GateVisualization isLoading={isLoading} activeStage={activeStage} />
          <DecisionOutputCard result={result} />
        </section>

        {error && <Toast message={error} onDismiss={() => setError(null)} />}
      </div>
    </main>
  );
}
