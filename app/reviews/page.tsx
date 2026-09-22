"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REPORTING_CONCERN_REVIEW_THRESHOLD, type PatternCluster } from "../../lib/pattern-engine";
import { isAuthorityUser } from "../../lib/supabase/authority";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type ReviewReport = {
  id: string;
  report_id: string;
  category: string | null;
  description: string | null;
  location_name: string | null;
  location_label: string | null;
  incident_time: string;
  status?: string | null;
  review_notes?: string | null;
};

export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPatternGroupId = searchParams.get("patternGroupId");
  const [status, setStatus] = useState("submitted");
  const [notes, setNotes] = useState("");
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<PatternCluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReviewQueue() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !isAuthorityUser(user)) {
        router.replace("/login?next=/reviews");
        return;
      }

      try {
        if (!selectedPatternGroupId) {
          setSelectedPattern(null);
          setReports([]);
          setStatus("submitted");
          setNotes("");
          return;
        }

        const response = await fetch("/api/authority/overview");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load the review queue.");

        const loadedPattern = (result.patterns ?? []).find((pattern: { patternGroupId: string }) => pattern.patternGroupId === selectedPatternGroupId);
        if (!loadedPattern) {
          setSelectedPattern(null);
          setReports([]);
          setStatus("submitted");
          setNotes("");
          return;
        }
        if (loadedPattern.manipulationScore < REPORTING_CONCERN_REVIEW_THRESHOLD) {
          router.replace(`/patterns/${encodeURIComponent(loadedPattern.patternGroupId)}`);
          return;
        }
        setSelectedPattern(loadedPattern);
        setReports(loadedPattern.reports ?? []);
        const firstReport = loadedPattern.reports?.[0];
        if (firstReport) {
          setStatus((firstReport.status || "submitted").toLowerCase());
          setNotes(firstReport.review_notes || "");
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load the review queue.");
      } finally {
        setLoading(false);
      }
    }

    void loadReviewQueue();
  }, [router, selectedPatternGroupId]);

  const activeReports = useMemo(() => reports.filter((report) => (report.status ?? "submitted").toLowerCase() !== "deferred"), [reports]);
  const primaryPattern = useMemo(() => selectedPattern ? { ...selectedPattern, reports: activeReports } : null, [activeReports, selectedPattern]);
  const relatedReports = useMemo(() => primaryPattern?.reports ?? [], [primaryPattern]);
  const relatedCount = relatedReports.length;
  const corroborationScore = primaryPattern?.corroborationScore ?? 0;
  const reporterDiversity = primaryPattern?.reporterDiversity ?? 0;
  const recentCount = primaryPattern?.recentCount ?? 0;
  const previousCount = primaryPattern?.previousCount ?? 0;
  const reportingBehaviourStatus = primaryPattern?.suspicious ? "Review" : "Low";
  const reportingBehaviourMessage = primaryPattern?.suspicious ? primaryPattern.suspiciousMessage : "No unusual reporting concentration detected.";

  async function handleReviewAction(nextStatus: "investigating" | "dismissed" | "deferred") {
    setSaving(true);
    setError("");

    try {
      if (!relatedReports.length) {
        throw new Error("No reports in the active pattern to review.");
      }

      const requests = relatedReports.map((report) =>
        fetch("/api/reports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report_id: report.report_id,
            status: nextStatus,
            review_notes: notes || null,
            reviewed_by: "authority-reviewer",
          }),
        })
      );

      const results = await Promise.all(requests);
      const payloads = await Promise.all(results.map((response) => response.json()));
      const failed = payloads.find((item, index) => !results[index].ok);

      if (failed) {
        throw new Error(failed.error || "Unable to update the review queue.");
      }

      setStatus(nextStatus);
      setReports((currentReports) =>
        currentReports.map((report) => ({
          ...report,
          status: nextStatus,
          review_notes: notes || null,
        }))
      );
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to update the review queue.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-[#3B3540]">
        <div className="safe-card px-8 py-6 text-[#5E5967]">Loading review queue...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-[#FAF8F5] p-8 text-[#3B3540]">
        <div className="page-shell max-w-2xl rounded-3xl border border-[#E7E0E3] bg-[#FFF9F8] p-8">
          <h1 className="text-xl font-extrabold text-[#B94A48]">Review queue unavailable</h1>
          <p className="mt-3 text-[#7D5F6E]">{error}</p>
        </div>
      </main>
    );
  }

  if (!selectedPattern && !selectedPatternGroupId) {
    return (
      <main className="bg-[#FAF8F5] py-10 text-[#3B3540] md:py-12">
        <div className="page-shell max-w-3xl rounded-3xl border border-[#E7E0E3] bg-white p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#432A52]">Report review</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#2D1B36]">No reporting reviews needed</h1>
          <p className="mt-3 text-[#5E5967]">No report cluster is currently above the review threshold.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#FAF8F5] py-10 text-[#3B3540] md:py-12">
      <div className="page-shell">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#432A52]">Report review</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">
              {primaryPattern ? `Reporting Review` : "Review queue"}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E7E0E3] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#432A52]">
            {primaryPattern?.suspicious ? "Review needed" : "Monitoring"}
          </div>
        </div>

        <section className="mb-6 safe-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#432A52]">Review status</p>
              <p className="mt-2 text-3xl font-extrabold text-[#2D1B36]">{status}</p>
            </div>
            <div className="rounded-full border border-[#E7E0E3] bg-[#FAF8F5] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#432A52]">
              Human review required
            </div>
          </div>
        </section>

        {primaryPattern ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Related reports" value={String(relatedCount)} />
          <MetricCard label="Different reporters" value={String(reporterDiversity)} accent="emerald" />
          <MetricCard label="Safety level" value={`${primaryPattern.safetyRiskScore}/100`} />
          <MetricCard label="Reporting concern" value={`${primaryPattern.manipulationScore}`} accent="amber" />
          <MetricCard label="Report consistency" value={`${corroborationScore}/100`} accent="emerald" />
        </section> : null}

        {primaryPattern?.suspicious ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <aside className="safe-card p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#432A52]">Report cluster</p>
                  <h2 className="mt-2 text-2xl font-extrabold text-[#2D1B36]">{primaryPattern.locationName}</h2>
                </div>
                <span className="status-badge status-badge--medium">{status}</span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Safety level</p>
                  <p className="mt-2 text-3xl font-extrabold text-[#2D1B36]">
                {primaryPattern.risingPercent === null ? "New activity" : `+${primaryPattern.risingPercent}%`}
              </p>
                </div>

                <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4">
                  <p className="text-sm font-bold text-[#2D1B36]">Why this was flagged</p>
                  <div className="mt-4 space-y-3">
                    {primaryPattern.connectionExplanation.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-xl border border-[#E7E0E3] bg-[#FAF8F5] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#432A52]">
                          {index === 0 ? "Location" : index === 1 ? "Time" : index === 2 ? "Category" : index === 3 ? "Behaviour" : "Different reporters"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#5E5967]">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[#2D1B36]">Reporting concern</p>
                    <span className={`status-badge ${primaryPattern.suspicious ? "status-badge--medium" : "status-badge--low"}`}>
                      {primaryPattern.suspicious ? "Elevated" : "Low"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5E5967]">These reports show unusually concentrated reporting behaviour. Human review is recommended.</p>
                </div>
              </div>
            </aside>

            <section className="safe-card p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#432A52]">Review action</p>
                  <h2 className="mt-2 text-2xl font-extrabold text-[#2D1B36]">Review notes</h2>
                </div>
                <div className="rounded-full border border-[#E7E0E3] bg-[#FAF8F5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#432A52]">
                  {relatedCount} related
                </div>
              </div>

              <label className="mt-6 block text-sm font-bold text-[#2D1B36]">Authority notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add review notes..."
                className="input-shell mt-2 min-h-[140px] resize-none"
              />

              {error && <p className="mt-3 text-sm text-[#B91C1C]">{error}</p>}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => handleReviewAction("investigating")} disabled={saving} className="primary-btn flex-1">
                  {saving ? "Saving..." : "Mark as Investigating"}
                </button>
                <button type="button" onClick={() => handleReviewAction("deferred")} disabled={saving} className="secondary-btn flex-1">
                  {saving ? "Saving..." : "Defer"}
                </button>
                <button type="button" onClick={() => handleReviewAction("dismissed")} disabled={saving} className="secondary-btn flex-1">
                  {saving ? "Saving..." : "Dismiss"}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <section className="mt-8 safe-card p-6 text-[#5C628F]">
            <p className="font-extrabold text-[#2D1B36]">NO REPORTS REQUIRE HUMAN REVIEW</p>
            <p className="mt-2">No suspicious reporting pattern is currently awaiting review.</p>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-[#E7E0E3] bg-white p-5 text-[#5E5967]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#432A52]">Important</p>
          <p className="mt-2 text-sm leading-7">SafeSignal surfaces reported patterns for human review. It does not determine guilt, identify perpetrators, or make enforcement decisions.</p>
        </section>
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
