"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildPatternClusters } from "../../lib/pattern-engine";
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
  const [status, setStatus] = useState("submitted");
  const [notes, setNotes] = useState("");
  const [reports, setReports] = useState<ReviewReport[]>([]);
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
        const response = await fetch("/api/reports?view=authority");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load the review queue.");

        setReports(result.reports ?? []);
        const firstReport = (result.reports ?? [])[0];
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
  }, [router]);

  const clusters = useMemo(() => buildPatternClusters(reports), [reports]);
  const primaryPattern = clusters[0] ?? null;
  const relatedReports = primaryPattern?.reports ?? [];
  const relatedCount = relatedReports.length;
  const corroborationScore = primaryPattern?.corroborationScore ?? 0;
  const reporterDiversity = primaryPattern?.reporterDiversity ?? 0;
  const recentCount = primaryPattern?.recentCount ?? 0;
  const previousCount = primaryPattern?.previousCount ?? 0;
  const reportingBehaviourStatus = primaryPattern?.suspicious ? "Review" : "Low";
  const reportingBehaviourMessage = primaryPattern?.suspicious ? primaryPattern.suspiciousMessage : "No unusual reporting concentration detected.";

  async function handleReviewAction(nextStatus: "under_review" | "reviewed") {
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

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-8 py-6 text-slate-400">Loading review queue...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-xl font-bold text-red-300">Review queue unavailable</h1>
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
            <h1 className="mt-1 text-3xl font-bold">Human Review Queue</h1>
          </div>

          <div className="flex items-center gap-3">
            <a href="/dashboard" className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-200 hover:bg-slate-800">Back to Dashboard</a>
            <button type="button" onClick={handleSignOut} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-amber-400">HUMAN REVIEW REQUIRED</p>
          <h2 className="mt-2 text-2xl font-bold">{primaryPattern ? `Emerging Pattern: ${primaryPattern.label}` : "No active pattern"}</h2>
          <p className="mt-2 max-w-3xl text-slate-400">
            {primaryPattern
              ? "SafeSignal has identified rising reported safety activity in this area using anonymous submissions, spatial proximity, time similarity, and related behavioural signals."
              : "No connected pattern is currently being surfaced for review."}
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-amber-500/30 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Review status</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{status}</p>
            </div>
            <div className="text-sm text-slate-400">Human decision required</div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Related Reports" value={String(relatedCount)} />
          <MetricCard label="Corroboration Support" value={`${corroborationScore}/100`} accent="emerald" />
          <MetricCard label="Recent Activity" value={String(recentCount)} />
          <MetricCard label="Previous Activity" value={String(previousCount)} />
          <MetricCard label="Reporter Diversity" value={String(reporterDiversity)} accent="emerald" />
        </section>

        {primaryPattern ? (
          <>
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold">Why this pattern was flagged</h3>
              <p className="mt-2 text-sm text-slate-400">The connection explanation below reflects the strongest support signals from the cluster.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {primaryPattern.connectionExplanation.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">{index === 0 ? "Location" : index === 1 ? "Time" : index === 2 ? "Category" : index === 3 ? "Behaviour" : "Reporter diversity"}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold">Reporting behaviour</h3>
                  <p className="mt-2 text-sm text-slate-400">{reportingBehaviourMessage}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Status</p>
                  <p className={`mt-1 text-xl font-bold ${primaryPattern.suspicious ? "text-amber-400" : "text-emerald-400"}`}>{reportingBehaviourStatus}</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                This signal looks for unusually concentrated or highly similar reporting behaviour. It is a review signal, not a determination that reports are false.
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-xl font-bold">Rising reported safety activity</h3>
              <p className="mt-2 text-sm text-slate-400">Recent activity is higher than the previous comparison period.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">Recent 7-day window</p>
                  <p className="mt-2 text-4xl font-bold text-amber-400">{recentCount}</p>
                  <p className="mt-2 text-sm text-slate-500">related reports</p>
                </div>
                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">Previous 7-day window</p>
                  <p className="mt-2 text-4xl font-bold">{previousCount}</p>
                  <p className="mt-2 text-sm text-slate-500">related reports</p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-slate-900 p-6">
              <h3 className="text-xl font-bold">Human review action</h3>
              <p className="mt-2 text-sm text-slate-400">Review the available reports and supporting signals before deciding what action, if any, is appropriate.</p>

              <label className="mt-6 block text-sm font-medium text-slate-300">Reviewer notes</label>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add review notes..." className="mt-2 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" />

              {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => handleReviewAction("under_review")} disabled={saving} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Saving..." : "Mark as Investigating"}
                </button>
                <button type="button" onClick={() => handleReviewAction("reviewed")} disabled={saving} className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Saving..." : "Dismiss"}
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            No active pattern is currently available for review. The queue is empty until a connected cluster emerges.
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="font-semibold text-amber-400">Important</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">SafeSignal surfaces reported patterns for human review. It does not determine guilt, identify perpetrators, or make enforcement decisions.</p>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, accent = "default" }: { label: string; value: string; accent?: "default" | "emerald" }) {
  const styles = {
    default: "border-slate-800 bg-slate-900 text-white",
    emerald: "border-emerald-500/30 bg-slate-900 text-emerald-400",
  }[accent];

  return (
    <div className={`rounded-2xl border p-5 ${styles}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
