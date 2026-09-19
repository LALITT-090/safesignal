import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
          Anonymous Safety Reporting
        </p>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          SafeSignal
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Report minor safety incidents anonymously. SafeSignal connects
          related reports to help identify rising safety activity earlier.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/report"
            className="rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Report an Incident
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-slate-700 px-8 py-4 font-semibold text-white transition hover:bg-slate-900"
          >
            Authority Login
          </Link>
        </div>

        <div className="mt-16 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold">Anonymous</h2>
            <p className="mt-2 text-sm text-slate-400">
              No account required to submit a report.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold">Connect</h2>
            <p className="mt-2 text-sm text-slate-400">
              Related reports are connected using location, time and meaning.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold">Human Review</h2>
            <p className="mt-2 text-sm text-slate-400">
              Patterns are surfaced for human review, not automated decisions.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}