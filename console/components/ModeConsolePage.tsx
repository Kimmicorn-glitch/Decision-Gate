"use client";

import AuthGate from "@/components/AuthGate";
import { SideNav, TopControlBar } from "@/components/ControlFrame";
import Header from "@/components/Header";
import ModePanels from "@/components/ModePanels";
import { ConsoleMode } from "@/lib/controlData";

type ModeConsolePageProps = {
  mode: ConsoleMode;
};

export default function ModeConsolePage({ mode }: ModeConsolePageProps) {
  return (
    <AuthGate>
      <main className="grid-overlay min-h-screen">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
          <Header />
          <TopControlBar mode={mode} />

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr]">
            <SideNav />

            <div className="space-y-4" id="dashboard">
              <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.88))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Console Overview
                </p>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-50">
                      Monitor governed AI operations from one dashboard.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      The console now focuses on visibility across environments, integrations,
                      auditability, and policy posture. Agent prompt and command review has been
                      moved into a dedicated advisory page so operators can handle bot decisions in
                      a purpose-built workflow.
                    </p>
                  </div>
                  <a
                    href="/advisory"
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100 hover:border-cyan-300/50"
                  >
                    Open Advisory Review
                  </a>
                </div>
              </section>

              <ModePanels mode={mode} />
            </div>
          </section>
        </div>
      </main>
    </AuthGate>
  );
}
