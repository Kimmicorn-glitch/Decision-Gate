import Link from "next/link";

import PublicPageShell from "@/components/PublicPageShell";
import { incidentResearch, learningLoop, safetyTracker } from "@/lib/safetyResearch";

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About"
      title="Decision Gate is a governed execution layer for AI-assisted software actions."
      description="It starts with authentication, evaluates proposed actions through planning, execution, governance, and critique stages, then records the final decision in an audit trail."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard
          title="How it works now"
          text="Users authenticate first, then the system scores a requested action, applies guardrail policies, and stores the result with reasoning and identifiers."
        />
        <SectionCard
          title="What it will not do"
          text="It should not silently help with malware, backdoors, stealth, auth bypass, or other deceptive changes. Those requests should hard-block."
        />
        <SectionCard
          title="How it improves"
          text="It learns through supervised updates: incident review, new policy rules, stronger tests, and monitored releases rather than autonomous self-retraining in production."
        />
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
            Safety Learning Loop
          </h3>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {learningLoop.map((step, index) => (
              <li key={step}>
                <span className="mr-2 text-cyan-300">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
            Safety Tracker
          </h3>
          <div className="mt-4 space-y-3">
            {safetyTracker.map((item) => (
              <div key={item.category} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">{item.category}</h4>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.learning}</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">{item.guardrail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
          External Research Informing Guardrails
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {incidentResearch.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{item.date}</p>
              <h4 className="mt-2 text-base font-semibold text-slate-100">{item.title}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.takeaway}</p>
              <Link
                className="mt-3 inline-flex text-sm text-cyan-300 hover:text-cyan-200"
                href={item.sourceUrl}
                target="_blank"
              >
                {item.sourceLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}

function SectionCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
    </article>
  );
}
