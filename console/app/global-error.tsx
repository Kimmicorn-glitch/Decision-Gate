"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="grid-overlay min-h-screen">
          <div className="mx-auto max-w-[880px] px-4 py-10 md:px-8">
            <section className="rounded-2xl border border-red-400/30 bg-red-950/20 p-6">
              <h1 className="text-lg font-semibold text-red-200">Application error</h1>
              <p className="mt-2 text-sm text-red-100/90">
                A global rendering error occurred. Retry the current action.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white"
              >
                Reload
              </button>
              {error?.digest && (
                <p className="mt-3 text-xs text-red-100/70">Digest: {error.digest}</p>
              )}
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
