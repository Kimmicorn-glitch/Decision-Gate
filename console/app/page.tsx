import Link from "next/link";

import Header from "@/components/Header";

export default function HomePage() {
  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
        <Header publicView />
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Agent Decision Gate
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
                Secure AI actions before they reach production systems.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Start with authentication, then move into the governance console, audit trail,
                and integration controls.
              </p>
            </div>
          </div>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-cyan-400/15 bg-slate-950/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                First Interaction
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-50">
                Login or create the first admin account.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Existing teams should sign in. New installations should create the initial admin
                account once, then manage additional operators and viewers from Settings.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-blue-50"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-100"
                >
                  Sign Up
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <InfoCard
                title="What you get after login"
                text="Decision review console, bot monitoring, audit history, tenant settings, and controlled user management."
              />
              <InfoCard
                title="Authentication model"
                text="Public signup is for the first bootstrap admin. After setup, admins create and manage all other users."
              />
              <InfoCard
                title="Learn before entering"
                text="Public About, Policies, and FAQ pages explain the product, operating rules, and the expected workflow."
              />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
    </article>
  );
}
