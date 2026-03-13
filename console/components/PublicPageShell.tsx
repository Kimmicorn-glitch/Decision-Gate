import Header from "@/components/Header";

type PublicPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function PublicPageShell({
  eyebrow,
  title,
  description,
  children
}: PublicPageShellProps) {
  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
        <Header publicView />
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
