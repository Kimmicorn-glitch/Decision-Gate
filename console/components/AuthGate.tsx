"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adg_admin_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="grid-overlay flex min-h-screen items-center justify-center px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
          Validating session...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
