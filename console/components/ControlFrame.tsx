"use client";

import Link from "next/link";

import { ConsoleMode } from "@/lib/controlData";

type ControlFrameProps = {
  mode: ConsoleMode;
};

const modeOptions: { id: ConsoleMode; label: string; href: string }[] = [
  { id: "DEVOPS", label: "DevOps", href: "/console" },
  { id: "ENTERPRISE", label: "Enterprise", href: "/enterprise" },
  { id: "DATACENTER", label: "Data Center", href: "/datacenter" }
];

export function TopControlBar({ mode }: ControlFrameProps) {
  return (
    <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
          Decision Gate Control Plane
        </p>
        <select className="rounded-xl border border-white/15 bg-slate-950/70 px-2 py-1 text-xs text-slate-200">
          <option>Env: Prod</option>
          <option>Env: Staging</option>
          <option>Env: Dev</option>
        </select>
        <select className="rounded-xl border border-white/15 bg-slate-950/70 px-2 py-1 text-xs text-slate-200">
          <option>Region: East US</option>
          <option>Region: EU West</option>
          <option>Region: West US</option>
        </select>
        <select className="rounded-xl border border-white/15 bg-slate-950/70 px-2 py-1 text-xs text-slate-200">
          <option>Agent: All</option>
          <option>Agent: Governance</option>
          <option>Agent: Execution</option>
        </select>
        <div className="rounded-xl border border-blue-300/30 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-blue-100">
          Model Router: Active
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {modeOptions.map((option) => (
          <Link
            key={option.id}
            href={option.href}
            className={[
              "rounded-xl border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-all",
              mode === option.id
                ? "border-blue-300/40 bg-blue-500/15 text-blue-100"
                : "border-white/15 bg-white/5 text-slate-300"
            ].join(" ")}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SideNav() {
  const items = [
    { label: "Dashboard", href: "#dashboard" },
    { label: "Advisory Review", href: "/advisory" },
    { label: "Active Agents", href: "#agents" },
    { label: "Bot Tracking", href: "/bots" },
    { label: "Policies", href: "/policies" },
    { label: "Decision Logs", href: "/audit" },
    { label: "Integrations", href: "#integrations" },
    { label: "Settings", href: "/settings" }
  ];

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
      <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-300">Navigation</p>
      <ul className="space-y-2 text-sm text-slate-200">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="block rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 transition-all hover:border-blue-300/30 hover:text-blue-100"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
