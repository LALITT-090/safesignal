"use client";

export default function GlobalError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="max-w-lg rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center shadow-2xl shadow-black/20">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-300">
          SafeSignal
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-red-100/90">
          The app encountered an unexpected issue. Try refreshing or restarting the flow.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-400"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
