import PublicPageShell from "@/components/PublicPageShell";

const policyGroups = [
  {
    name: "Access Control",
    text: "Only authenticated users can open operational dashboards. Admins manage user creation and tenant settings."
  },
  {
    name: "Action Governance",
    text: "Each proposed action is evaluated before execution and can be approved, revised, or blocked based on risk and policy checks."
  },
  {
    name: "Auditability",
    text: "Every evaluated action should produce an audit record with decision, confidence, reasoning, and timestamps for review."
  },
  {
    name: "Integration Hygiene",
    text: "Bots and external agent links must be registered and monitored so decisions can be traced back to their source system."
  }
];

export default function PoliciesPage() {
  return (
    <PublicPageShell
      eyebrow="Policies"
      title="Platform policies define how AI actions are permitted, revised, or blocked."
      description="This page gives users a plain-language summary of the operating rules before they enter the console."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {policyGroups.map((policy) => (
          <article
            key={policy.name}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
              {policy.name}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{policy.text}</p>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
