import Link from "next/link";

const signalFlow = [
  "REPORT",
  "PROTECT",
  "CONNECT",
  "CORROBORATE",
  "DETECT",
  "HUMAN REVIEW",
];

export default function Home() {
  return (
    <main className="bg-[#FAF8F5] text-[#3B3540]">
      <section className="page-shell grid items-center gap-12 pb-20 pt-12 md:pb-24 md:pt-16 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center rounded-full border border-[#E7E0E3] bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#432A52] shadow-[0_8px_18px_rgba(67,42,82,0.04)]">
            Anonymous safety reporting
          </div>

          <div className="space-y-5">
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] text-[#432A52] md:text-5xl xl:text-6xl">
              Report early. Help make places safer.
            </h1>

            <p className="max-w-lg text-lg leading-8 text-[#5E5967]">
              SafeSignal lets people anonymously report safety concerns and helps authorities identify rising reported safety activity with context, care, and human review.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/report" className="primary-btn">
              Report a Safety Concern
            </Link>
            <Link href="#how-it-works" className="secondary-btn">
              How SafeSignal Works
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[#432A52]">
            <span className="rounded-full border border-[#E7E0E3] bg-white px-3 py-1.5 font-semibold">Anonymous</span>
            <span className="rounded-full border border-[#E7E0E3] bg-white px-3 py-1.5 font-semibold">Privacy-aware</span>
            <span className="rounded-full border border-[#E7E0E3] bg-white px-3 py-1.5 font-semibold">Human review</span>
          </div>
        </div>

        <div className="safe-card-strong p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#432A52]">Signal flow</p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#2D1B36]">How it works</h2>
            </div>
            <div className="rounded-full border border-[#E7E0E3] bg-[#FAF8F5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#432A52]">
              Safer communities
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {signalFlow.map((step, index) => (
              <div key={step} className="flex items-center gap-2.5">
                <div className="rounded-2xl border border-[#E7E0E3] bg-[#F7F1F3] px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#432A52]">
                  {step}
                </div>
                {index < signalFlow.length - 1 && (
                  <span aria-hidden="true" className="text-xl font-bold text-[#432A52]">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["Anonymous reporting", "Share what feels safe without requiring a personal account."],
              ["Location privacy", "Details are reviewed with care and only accessed by trusted authority workflows."],
              ["Connected patterns", "Related reports can be grouped to help surface emerging concern areas."],
              ["Human review", "Signals are reviewed by people and not treated as automated enforcement."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-[#E7E0E3] bg-white p-4">
                <p className="text-base font-extrabold text-[#2D1B36]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#5E5967]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="page-shell pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#432A52]">Trust and safety</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#2D1B36]">Built for calm, careful review</h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Anonymous reporting", "Reports can be submitted without a name or contact detail."],
            ["No perpetrator identification", "SafeSignal does not attempt to identify a person from a report."],
            ["No guilt determination", "The system surfaces signals for review; it does not determine guilt."],
            ["Human review", "Patterns are evaluated by people using the available context and local response workflows."],
            ["Location privacy", "The product is designed to reduce unnecessary exposure of personal location details."],
          ].map(([title, text]) => (
            <div key={title} className="safe-card p-5">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F3ECF1] text-lg text-[#432A52]">
                ✓
              </div>
              <h3 className="text-lg font-extrabold text-[#2D1B36]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5E5967]">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}