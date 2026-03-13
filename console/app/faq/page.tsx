import PublicPageShell from "@/components/PublicPageShell";

const faqItems = [
  {
    question: "Who can sign up?",
    answer:
      "Public signup is only for the first bootstrap admin. After that, admins create users from the Settings page."
  },
  {
    question: "What is the first task after login?",
    answer:
      "Open Settings, verify the tenant configuration, and link the agent or bot integrations you expect to govern."
  },
  {
    question: "What does APPROVE, REVISE, or BLOCK mean?",
    answer:
      "Approve means the action can proceed, revise means it needs changes before proceeding, and block means the action violates policy or risk thresholds."
  },
  {
    question: "Where do I verify what happened?",
    answer:
      "Use the Audit page for decision history and the Bots page for integration health and runtime monitoring."
  }
];

export default function FaqPage() {
  return (
    <PublicPageShell
      eyebrow="FAQ"
      title="Common questions for first-time operators and admins."
      description="These answers frame the workflow before a user enters the protected console."
    >
      <div className="space-y-4">
        {faqItems.map((item) => (
          <article
            key={item.question}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
          >
            <h3 className="text-base font-semibold text-slate-100">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{item.answer}</p>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
