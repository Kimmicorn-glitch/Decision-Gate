"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { loginAdmin } from "@/lib/api";

function validateUsername(value: string): string | null {
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(value)) {
    return "Username must be 3-32 chars and use letters, numbers, _ or -.";
  }
  return null;
}

function validatePassword(value: string): string | null {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  const hasSymbol = /[^a-zA-Z0-9\s]/.test(value);
  if (value.length < 12 || !hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return "Password must be 12+ chars with upper/lower/digit/symbol.";
  }
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const usernameErr = validateUsername(username);
    if (usernameErr) {
      setError(usernameErr);
      return;
    }

    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }

    try {
      setLoading(true);
      const response = await loginAdmin({ username, password });
      localStorage.setItem("adg_admin_token", response.token);
      localStorage.setItem("adg_admin_expires", response.expires_at);
      localStorage.setItem("adg_admin_username", response.username);
      localStorage.setItem("adg_admin_role", response.role);
      router.push("/settings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[880px] px-4 py-6 md:px-8">
        <Header />
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Admin Login
          </h2>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-xs uppercase tracking-[0.12em] text-slate-300">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
                required
              />
            </label>

            <label className="block text-xs uppercase tracking-[0.12em] text-slate-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-blue-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </main>
  );
}
