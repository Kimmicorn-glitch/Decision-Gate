"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/console");
  }, [router]);

  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[880px] px-4 py-6 md:px-8">
        <Header publicView />
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Login removed
          </h2>
          <p className="text-sm leading-7 text-slate-300">
            Authentication is disabled. You are being redirected into the app.
          </p>
        </section>
      </div>
    </main>
  );
}
