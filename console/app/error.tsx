"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto max-w-[880px] px-4 py-10 md:px-8">
        <section className="rounded-2xl border border-red-400/30 bg-red-950/20 p-6">
          <h1 className="text-lg font-semibold text-red-200">Something went wrong</h1>
          <p className="mt-2 text-sm text-red-100/90">
            The console hit an unexpected error.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </section>
      </div>
    </main>
  );
}
