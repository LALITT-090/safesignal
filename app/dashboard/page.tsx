"use client";

import { useEffect, useMemo, useState } from "react";
import { REPORTING_CONCERN_REVIEW_THRESHOLD, buildPatternClusters } from "../../lib/pattern-engine";

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

type Pattern = ReturnType<typeof buildPatternClusters>[number];

type Alert = {
  id: string;
  pattern_group_id: string;
  title: string | null;
  status: string | null;
};

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const response = await fetch("/api/authority/overview");
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load reports.");
          return;
        }

        setReports(result.reports ?? []);
        setPatterns(result.patterns ?? []);
        setAlerts(result.alerts ?? []);
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to connect to the reports API.");
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, []);

  const clusters = useMemo(() => patterns, [patterns]);
  const primaryPattern = clusters[0] ?? null;
  const recentReports = [...reports]
    .sort((left, right) => new Date(right.incident_time).getTime() - new Date(left.incident_time).getTime())
    .slice(0, 8);

  const activeAlerts = alerts.filter((alert) =>
    (alert.status === "new" || alert.status === "acknowledged") &&
    alert.pattern_group_id &&
    alert.title === "Rising reported safety activity"
  );
  const reviewClusters = clusters.filter((cluster) => cluster.manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD || cluster.suspicious);
  const needsAttention = clusters
    .map((cluster) => {
      const hasSafetyAlert = cluster.safetyRiskScore >= 70 && cluster.reports.length >= 10;
      const hasReview = cluster.manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD || cluster.suspicious;
      if (!hasSafetyAlert && !hasReview) {
        return null;
      }
      return {
        id: cluster.patternGroupId,
        location: cluster.locationName,
        reportCount: cluster.reports.length,
        reporterCount: cluster.reporterDiversity,
        safetyLevel: cluster.safetyRiskScore >= 70 ? "High safety level" : cluster.safetyRiskScore >= 40 ? "Elevated safety level" : "Low safety level",
        riskLabel: hasReview ? "Possible reporting manipulation" : "High safety level",
        action: hasReview && hasSafetyAlert ? "alert+review" : hasReview ? "review" : "alert",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

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
          <MetricCard label="Total reports" value={String(reports.length)} />
          <MetricCard label="Active safety alerts" value={String(activeAlerts.length)} accent={activeAlerts.length > 0 ? "amber" : "default"} />
          <MetricCard label="Reviews needed" value={String(reviewClusters.length)} accent={reviewClusters.length > 0 ? "red" : "default"} />
          <MetricCard label="Active report clusters" value={String(clusters.length)} accent={clusters.length > 0 ? "emerald" : "default"} />
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#2F3273]">Needs Attention</h2>
              <p className="mt-1 text-sm text-[#5C628F]">Focused actions for report clusters and reporting review signals.</p>
            </div>
          </div>
          {needsAttention.length === 0 ? (
            <div className="safe-card p-6 text-[#5E5967]">
              <p className="font-extrabold text-[#2D1B36]">No active issues</p>
              <p className="mt-2 text-sm">No report cluster currently needs authority action.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {needsAttention.map((item) => (
                <article key={item.id} className="safe-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">{item.id}</p>
                      <h3 className="mt-2 text-xl font-extrabold text-[#2D1B36]">{item.location}</h3>
                    </div>
                    <span className={`status-badge ${item.action.includes("review") ? "status-badge--medium" : "status-badge--low"}`}>
                      {item.action === "alert+review" ? "Alert + review" : item.action === "review" ? "Review" : "Alert"}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <InfoBlock label="Related reports" value={String(item.reportCount)} description="Reports in this cluster" />
                    <InfoBlock label="Different reporters" value={String(item.reporterCount)} description="Distinct reporter signals" />
                    <InfoBlock label="Safety level" value={item.safetyLevel.includes("High") ? "HIGH" : item.safetyLevel.includes("Elevated") ? "ELEVATED" : "LOW"} description="Reported activity" />
                    <InfoBlock label="Reporting concern" value={item.action.includes("review") ? "HIGH" : "LOW"} description="Review threshold" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {item.action === "review" || item.action === "alert+review" ? (
                      <a href={`/reviews?patternGroupId=${encodeURIComponent(item.id)}`} className="primary-btn inline-flex">Review</a>
                    ) : null}
                    {item.action === "alert" || item.action === "alert+review" ? (
                      <a href={`/patterns/${encodeURIComponent(item.id)}`} className="secondary-btn inline-flex">View Alert</a>
                    ) : (
                      <a href={`/patterns/${encodeURIComponent(item.id)}`} className="secondary-btn inline-flex">View Cluster</a>
                    )}
                  </div>
                </article>
              ))}
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
