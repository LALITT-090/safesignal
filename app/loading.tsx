export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-8 py-6 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
          SafeSignal
        </p>
        <p className="mt-2 text-slate-400">Loading your safety dashboard...</p>
      </div>
    </main>
  );
}
