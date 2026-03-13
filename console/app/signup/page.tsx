"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { registerAdmin } from "@/lib/api";

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

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const usernameErr = validateUsername(username);
    if (usernameErr) {
      setMessage(usernameErr);
      return;
    }

    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setMessage(passwordErr);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Password confirmation does not match.");
      return;
    }

    try {
      setLoading(true);
      await registerAdmin("", { username, password, role: "admin" });
      router.push("/login?created=1");
    } catch (err) {
      const fallback =
        "Sign up is only available before the first account exists. Ask an admin to create your user in Settings.";
      setMessage(err instanceof Error ? `${err.message} ${fallback}` : fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[880px] px-4 py-6 md:px-8">
        <Header publicView />
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Create First Admin
          </h2>
          <p className="mb-5 text-sm leading-7 text-slate-300">
            Use this once to bootstrap a new installation. After the first admin exists, user
            creation moves into the authenticated Settings page.
          </p>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-xs uppercase tracking-[0.12em] text-slate-300">
              Admin Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
                required
              />
            </label>

            <label className="block text-xs uppercase tracking-[0.12em] text-slate-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
                required
              />
            </label>

            <label className="block text-xs uppercase tracking-[0.12em] text-slate-300">
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-blue-50"
            >
              {loading ? "Creating..." : "Create admin account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-400">
            Already have an account?{" "}
            <Link className="text-cyan-300 hover:text-cyan-200" href="/login">
              Login here
            </Link>
            .
          </p>
        </section>
      </div>

      {message && <Toast message={message} onDismiss={() => setMessage(null)} />}
    </main>
  );
}
