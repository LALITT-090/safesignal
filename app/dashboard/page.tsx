"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildPatternClusters } from "../../lib/pattern-engine";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

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
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

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
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-8 py-6 text-slate-400">
          Loading reports from SafeSignal...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-xl font-bold text-red-300">Unable to load reports</h1>
          <p className="mt-3 text-red-200">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">SafeSignal</p>
            <h1 className="mt-1 text-3xl font-bold">Authority Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-300">Operations</div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Reports" value={String(reports.length)} />
          <MetricCard label="Related Cluster" value={String(relatedReports.length)} accent="emerald" />
          <MetricCard label="Safety Activity" value={safetyActivity} accent={safetyActivity === "Rising" ? "amber" : "default"} />
          <MetricCard label="Review Status" value={reviewStatus} accent={reviewStatus === "Review" ? "red" : "default"} />
        </div>

        <section className="mt-8 rounded-3xl border border-amber-500/40 bg-slate-900 p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-400">Emerging Pattern</span>
                <span className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${primaryPattern ? "bg-red-500/10 text-red-400" : "bg-slate-700 text-slate-300"}`}>
                  {primaryPattern ? safetyActivity : "Monitoring"}
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-bold">{primaryPattern?.label || "No active pattern"}</h2>

              <p className="mt-3 max-w-3xl text-slate-400">
                {primaryPattern
                  ? "SafeSignal has connected multiple anonymous submissions around the same local area and time window. The signal supports human review and does not determine guilt or identity."
                  : "No emerging reported safety pattern is currently strong enough to surface for human review."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950 px-8 py-5 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Related Reports</p>
              <p className="mt-2 text-4xl font-bold">{relatedReports.length}</p>
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
                  <h3 className="text-xl font-semibold">Why these reports were connected</h3>
                  <p className="mt-1 text-sm text-slate-400">This pattern was assembled using location, timing, category and behavioural consistency.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {primaryPattern.connectionExplanation.map((explanation, index) => (
                    <div key={`${explanation}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <p className="text-sm text-slate-400">{index === 0 ? "Location" : index === 1 ? "Time" : index === 2 ? "Category" : index === 3 ? "Behaviour" : "Reporter diversity"}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Reporter diversity</p>
                    <p className="mt-1 text-sm text-slate-400">Multiple anonymous submissions contribute to this pattern.</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-3xl font-bold text-emerald-400">{primaryPattern.reporterDiversity}</p>
                    <p className="text-xs text-slate-500">unique anonymous submissions</p>
                  </div>
                </div>
              </div>

              <div className={`mt-6 rounded-2xl border p-6 ${primaryPattern.suspicious ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800 bg-slate-900"}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`font-semibold ${primaryPattern.suspicious ? "text-amber-300" : "text-emerald-300"}`}>Reporting behaviour</p>
                    <p className="mt-1 text-sm text-slate-400">{reportingBehaviourMessage}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
                    <p className={`mt-1 text-2xl font-bold ${primaryPattern.suspicious ? "text-amber-300" : "text-emerald-300"}`}>{reportingBehaviourStatus}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Corroboration support</p>
                    <p className="mt-1 text-sm text-slate-400">Support indicator based on consistency across related reports.</p>
                  </div>
                  <p className="text-4xl font-bold text-emerald-400">{corroborationScore}/100</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoBlock label="Recent activity" value={String(recentCount)} description="Related reports in the recent 7-day window." />
                <InfoBlock label="Previous activity" value={String(previousCount)} description="Related reports in the previous 7-day window." />
              </div>

              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">Rising reported safety activity</span>
                      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">Support signal</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">Emerging activity at {primaryPattern.label}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Reported safety activity is higher than the previous comparison period. This is not evidence of guilt or perpetrator identity.</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-slate-950 px-5 py-4 text-left sm:text-right">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Trend</p>
                    <p className="mt-1 text-lg font-bold text-amber-300">+{risingPercent}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
                <p className="font-semibold text-amber-300">Human review recommended</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">SafeSignal surfaces reported patterns for human review. It does not determine guilt, identify perpetrators, or automatically trigger enforcement.</p>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              No active pattern is currently strong enough to surface. The stream remains under monitoring.
            </div>
          )}
        </section>

        <section className="mt-10">
          <div>
            <h2 className="text-2xl font-bold">Recent Reports</h2>
            <p className="mt-1 text-sm text-slate-400">Most recent anonymous submissions currently stored in SafeSignal.</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-950">
                  <tr className="border-b border-slate-800">
                    <th className="px-5 py-4 text-sm font-semibold">Report ID</th>
                    <th className="px-5 py-4 text-sm font-semibold">Category</th>
                    <th className="px-5 py-4 text-sm font-semibold">Location</th>
                    <th className="px-5 py-4 text-sm font-semibold">Description</th>
                    <th className="px-5 py-4 text-sm font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-800 bg-slate-900">
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-emerald-400">{report.report_id}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">{report.category || "Not provided"}</td>
                      <td className="px-5 py-4 text-sm text-slate-300">{report.location_name || report.location_label || "Location unavailable"}</td>
                      <td className="max-w-md px-5 py-4 text-sm text-slate-400">{report.description || "No description provided."}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{new Date(report.incident_time).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {recentReports.length === 0 && (
              <div className="p-10 text-center text-slate-500">No reports available.</div>
            )}
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm leading-6 text-slate-500">
          SafeSignal connects anonymous reports using location, time, category and reported behaviour. Signals are surfaced for human review and do not identify perpetrators or determine guilt.
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, accent = "default" }: { label: string; value: string; accent?: "default" | "emerald" | "amber" | "red" }) {
  const styles = {
    default: "border-slate-800 bg-slate-900 text-white",
    emerald: "border-emerald-500/30 bg-slate-900 text-emerald-400",
    amber: "border-amber-500/30 bg-slate-900 text-amber-400",
    red: "border-red-500/30 bg-slate-900 text-red-400",
  }[accent];

  return (
    <div className={`rounded-2xl border p-6 ${styles}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
    </div>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}
