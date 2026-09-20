"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPatternClusters } from "../../lib/pattern-engine";

type Report = {
  id: string;
  report_id: string;
  category: string | null;
  description: string | null;
  location_name: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  incident_time: string;
};

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const response = await fetch("/api/reports?view=authority");
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load reports.");
          return;
        }

        setReports(result.reports ?? []);
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to connect to the reports API.");
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, []);

  const clusters = useMemo(() => buildPatternClusters(reports), [reports]);
  const primaryPattern = clusters[0] ?? null;
  const relatedReports = primaryPattern?.reports ?? [];
  const locationSimilarity = primaryPattern?.locationSimilarity ?? 0;
  const timeSimilarity = primaryPattern?.timeSimilarity ?? 0;
  const behaviourSimilarity = primaryPattern?.behaviourSimilarity ?? 0;
  const categorySimilarity = primaryPattern?.categorySimilarity ?? 0;
  const corroborationScore = primaryPattern?.corroborationScore ?? 0;
  const recentCount = primaryPattern?.recentCount ?? 0;
  const previousCount = primaryPattern?.previousCount ?? 0;
  const risingPercent = primaryPattern?.risingPercent ?? 0;
  const reportingBehaviourStatus = primaryPattern?.suspicious ? "Review" : "Low";
  const reportingBehaviourMessage = primaryPattern?.suspicious ? primaryPattern.suspiciousMessage : "No unusual reporting concentration detected.";
  const safetyActivity = primaryPattern && risingPercent > 0 ? "Rising" : "Monitoring";
  const reviewStatus = primaryPattern ? "Review" : "Monitoring";
  const recentReports = [...reports]
    .sort((left, right) => new Date(right.incident_time).getTime() - new Date(left.incident_time).getTime())
    .slice(0, 8);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-[#3B3540]">
        <div className="safe-card px-8 py-6 text-[#5E5967]">Loading reports from SafeSignal...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-[#FAF8F5] p-8 text-[#3B3540]">
        <div className="page-shell max-w-2xl rounded-3xl border border-[#E7E0E3] bg-[#FFF9F8] p-8">
          <h1 className="text-xl font-extrabold text-[#B94A48]">Unable to load reports</h1>
          <p className="mt-3 text-[#7D5F6E]">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#FAF8F5] py-10 text-[#3B3540] md:py-12">
      <div className="page-shell">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#432A52]">Authority dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">SafeSignal overview</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E7E0E3] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#432A52]">
            {primaryPattern ? "Human review active" : "Monitoring mode"}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Reports" value={String(reports.length)} />
          <MetricCard label="Independent reporter signals" value={String(primaryPattern?.reporterDiversity ?? 0)} accent="emerald" />
          <MetricCard label="Activity change" value={primaryPattern ? `+${risingPercent}%` : "0%"} accent={safetyActivity === "Rising" ? "amber" : "default"} />
          <MetricCard label="Patterns requiring review" value={primaryPattern ? "1" : "0"} accent={reviewStatus === "Review" ? "red" : "default"} />
        </div>

        <section className="mt-8 safe-card-strong p-7 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-[#F7E8CC] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C58A32]">Emerging pattern</span>
                <span className={`rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] ${primaryPattern ? "bg-[#F9E6E4] text-[#B94A48]" : "bg-[#F2ECF3] text-[#432A52]"}`}>
                  {primaryPattern ? safetyActivity : "Monitoring"}
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36] md:text-4xl">
                {primaryPattern?.label || "No active pattern"}
              </h2>

              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5E5967]">
                {primaryPattern
                  ? "SafeSignal has connected multiple anonymous submissions around the same local area and time window. The signal supports human review and does not determine guilt or identity."
                  : "No emerging reported safety pattern is currently strong enough to surface for human review."}
              </p>
            </div>

            <div className="min-w-[180px] rounded-2xl border border-[#E7E0E3] bg-white p-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#432A52]">Related reports</p>
              <p className="mt-2 text-4xl font-extrabold text-[#2D1B36]">{relatedReports.length}</p>
            </div>
          </div>

          {primaryPattern ? (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                <SignalTile label="Location similarity" value={`${locationSimilarity}%`} />
                <SignalTile label="Time similarity" value={`${timeSimilarity}%`} />
                <SignalTile label="Behaviour similarity" value={`${behaviourSimilarity}%`} />
                <SignalTile label="Category similarity" value={`${categorySimilarity}%`} />
              </div>

              <div className="mt-8">
                <div className="mb-4">
                  <h3 className="text-xl font-extrabold text-[#2F3273]">Why these reports were connected</h3>
                  <p className="mt-1 text-sm text-[#5C628F]">This pattern was assembled using location, timing, category and behavioural consistency.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {primaryPattern.connectionExplanation.map((explanation, index) => (
                    <div key={`${explanation}-${index}`} className="rounded-2xl border border-[#E7E0E3] bg-white p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#432A52]">
                        {index === 0 ? "Location" : index === 1 ? "Time" : index === 2 ? "Category" : index === 3 ? "Behaviour" : "Reporter diversity"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#5E5967]">{explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

                <div className="rounded-2xl border border-[#E7E0E3] bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#2D1B36]">Reporter diversity</p>
                      <p className="mt-1 text-sm text-[#5E5967]">Multiple anonymous submissions contribute to this pattern.</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-3xl font-extrabold text-[#432A52]">{primaryPattern.reporterDiversity}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5E5967]">Unique reports</p>
                  </div>
                </div>
              </div>

              <div className={`mt-6 rounded-2xl border p-6 ${primaryPattern.suspicious ? "border-[#F2D496] bg-[#FFF7E8]" : "border-[#E7E0E3] bg-white"}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`font-extrabold ${primaryPattern.suspicious ? "text-[#C58A32]" : "text-[#3F7D63]"}`}>Reporting behaviour</p>
                    <p className="mt-1 text-sm leading-6 text-[#5E5967]">{reportingBehaviourMessage}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Status</p>
                    <p className={`mt-1 text-2xl font-extrabold ${primaryPattern.suspicious ? "text-[#C58A32]" : "text-[#3F7D63]"}`}>{reportingBehaviourStatus}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#C9E8D9] bg-[#EEF9F4] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-extrabold text-[#3F7D63]">Corroboration support</p>
                    <p className="mt-1 text-sm text-[#5E5967]">Support indicator based on consistency across related reports.</p>
                  </div>
                  <p className="text-4xl font-extrabold text-[#3F7D63]">{corroborationScore}/100</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoBlock label="Recent activity" value={String(recentCount)} description="Related reports in the recent 7-day window." />
                <InfoBlock label="Previous activity" value={String(previousCount)} description="Related reports in the previous 7-day window." />
              </div>

              <div className="mt-6 rounded-2xl border border-[#F9DF77] bg-[#FFF9DE] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#FFF5C8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#B45309]">Rising activity</span>
                      <span className="rounded-full bg-[#FEE2E2] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#B91C1C]">Support signal</span>
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold text-[#2F3273]">Emerging activity at {primaryPattern.label}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5C628F]">Reported safety activity is higher than the previous comparison period. This is not evidence of guilt or perpetrator identity.</p>
                  </div>
                  <div className="rounded-xl border border-[#F6D35A] bg-white px-5 py-4 text-left sm:text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Trend</p>
                    <p className="mt-1 text-lg font-extrabold text-[#B45309]">+{risingPercent}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#E7E0E3] bg-white p-6">
                <p className="font-extrabold text-[#2F3273]">Human review recommended</p>
                <p className="mt-2 text-sm leading-6 text-[#5C628F]">SafeSignal surfaces reported patterns for human review. It does not determine guilt, identify perpetrators, or automatically trigger enforcement.</p>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-[#E7E0E3] bg-white p-6 text-[#5E5967]">
              No active pattern is currently strong enough to surface. The stream remains under monitoring.
            </div>
          )}
        </section>

        <section className="mt-10">
          <div>
            <h2 className="text-2xl font-extrabold text-[#2F3273]">Recent reports</h2>
            <p className="mt-1 text-sm text-[#5C628F]">Most recent anonymous submissions currently stored in SafeSignal.</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-[#E7E0E3] bg-white shadow-[0_18px_32px_rgba(67,42,82,0.04)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#FAF8F5]">
                  <tr className="border-b border-[#E7E0E3]">
                    <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Report ID</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Category</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Location</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Description</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report.id} className="border-b border-[#E7E0E3] bg-white last:border-b-0">
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-[#432A52]">{report.report_id}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[#2F3273]">{report.category || "Not provided"}</td>
                      <td className="px-5 py-4 text-sm text-[#5C628F]">{report.location_name || report.location_label || "Location unavailable"}</td>
                      <td className="max-w-md px-5 py-4 text-sm text-[#5C628F]">{report.description || "No description provided."}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[#5C628F]">{new Date(report.incident_time).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {recentReports.length === 0 && (
              <div className="p-10 text-center text-[#5C628F]">No reports available.</div>
            )}
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-[#E7E0E3] bg-white p-5 text-sm leading-7 text-[#5E5967]">
          SafeSignal connects anonymous reports using location, time, category and reported behaviour. Signals are surfaced for human review and do not identify perpetrators or determine guilt.
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, accent = "default" }: { label: string; value: string; accent?: "default" | "emerald" | "amber" | "red" }) {
  const styles = {
    default: "border-[#E7E0E3] bg-white text-[#2D1B36]",
    emerald: "border-[#C7F9D9] bg-[#ECFDF5] text-[#15803d]",
    amber: "border-[#F9DF77] bg-[#FFF9DE] text-[#B45309]",
    red: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  }[accent];

  return (
    <div className={`metric-card p-5 ${styles}`}>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.16em]">{label}</h3>
      <strong className="mt-3 block">{value}</strong>
    </div>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#432A52]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#2F3273]">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[#E7E0E3] bg-white p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#2F3273]">{value}</p>
      <p className="mt-2 text-sm text-[#5C628F]">{description}</p>
    </div>
  );
}
