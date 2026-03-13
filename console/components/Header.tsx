import Link from "next/link";

type HeaderProps = {
  publicView?: boolean;
};

export default function Header({ publicView = false }: HeaderProps) {
  const navItems = publicView
    ? [
        { href: "/", label: "Home" },
        { href: "/about", label: "About" },
        { href: "/policies", label: "Policies" },
        { href: "/faq", label: "FAQ" },
        { href: "/login", label: "Login" },
        { href: "/signup", label: "Sign Up" }
      ]
    : [
        { href: "/console", label: "Console" },
        { href: "/advisory", label: "Advisory" },
        { href: "/bots", label: "Bots" },
        { href: "/audit", label: "Audit Log" },
        { href: "/settings", label: "Settings" }
      ];

  return (
    <header className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-[0.08em] text-slate-100 md:text-xl">
          Agent Decision Gate - Decision Review Console
        </h1>
        <nav className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-slate-300">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 hover:border-blue-300/40 hover:text-slate-100"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
