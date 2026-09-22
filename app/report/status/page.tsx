"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

type Report = {
  report_id: string;
  category: string | null;
  description: string | null;
  location_name: string | null;
  location_label: string | null;
  incident_time: string | null;
  status: string | null;
};

type Pattern = {
  patternGroupId: string;
  reports: Array<{ report_id: string }>;
};

type AuthorityAlert = { title: string | null; status: string | null };

export default function ReportStatusPage() {
  const searchParams = useSearchParams();
  const [reportId, setReportId] = useState(searchParams.get("reportId") ?? "");
  const [report, setReport] = useState<Report | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [authorityAlert, setAuthorityAlert] = useState<AuthorityAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedId = reportId.trim();
    if (!normalizedId) {
      setError("Enter your Report ID.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/reports?report_id=${encodeURIComponent(normalizedId)}`);
      const result = await response.json();
      if (!response.ok || !result.report) {
        throw new Error(result.error || "No report was found for that ID.");
      }
      setReport(result.report);
      setPattern(result.pattern ?? null);
      setAuthorityAlert(result.authorityAlert ?? null);
    } catch (lookupError) {
      setReport(null);
      setPattern(null);
      setAuthorityAlert(null);
      setError(lookupError instanceof Error ? lookupError.message : "Unable to find this report.");
    } finally {
      setLoading(false);
    }
  }

  const resolved = report?.status === "resolved" || authorityAlert?.status === "resolved";

  return (
    <main className="bg-[#FAF8F5] px-4 py-12 text-[#3B3540] md:px-6">
      <div className="page-shell max-w-3xl">
        <div className="safe-card-strong p-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#432A52]">SafeSignal</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Track my report</h1>
          <p className="mt-3 text-sm leading-6 text-[#5E5967]">Enter your Report ID to see the current status of your submission.</p>

          <form onSubmit={handleLookup} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input value={reportId} onChange={(event) => setReportId(event.target.value)} placeholder="SS-XXXXXX" className="input-shell flex-1" aria-label="Report ID" />
            <button type="submit" disabled={loading} className="primary-btn">{loading ? "Checking..." : "Track report"}</button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-[#B94A48]">{error}</p>}

          {report && (
            <div className="mt-8 space-y-6">
              <section className="rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-5">
                <div className="flex flex-col gap-3 border-b border-[#E7E0E3] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#432A52]">Report ID</p><p className="mt-2 text-2xl font-extrabold text-[#432A52]">{report.report_id}</p></div><span className="status-badge status-badge--medium">{report.status || "submitted"}</span></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Category" value={report.category || "Not provided"} /><Info label="Location" value={report.location_label || report.location_name || "Location unavailable"} /><Info label="Submitted" value={report.incident_time ? new Date(report.incident_time).toLocaleString() : "Not recorded"} /><Info label="Description" value={report.description || "No description provided."} /></div>
              </section>

              <section className="rounded-2xl border border-[#E7E0E3] bg-white p-5"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#432A52]">Status timeline</p><div className="mt-5 space-y-4"><TimelineItem label="Report submitted" complete /><TimelineItem label="Report received" complete /><TimelineItem label="Under monitoring" complete={Boolean(report)} /><TimelineItem label="Included in emerging pattern" complete={Boolean(pattern)} /><TimelineItem label="Authority notified" complete={Boolean(authorityAlert)} /><TimelineItem label="Resolved" complete={resolved} /></div></section>

              <section className="rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-5"><p className="text-sm leading-7 text-[#5E5967]">{resolved ? "The authority has marked this report or pattern as resolved." : authorityAlert ? "The reported activity has been surfaced to the relevant authority." : pattern ? "Your report is contributing to an emerging safety pattern." : "Your report has been received. SafeSignal is checking whether other reports from the same area and time indicate an emerging safety pattern."}</p>{pattern && <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#432A52]">Pattern Group {pattern.patternGroupId}</p>}</section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-[0.16em] text-[#432A52]">{label}</p><p className="mt-1 text-sm font-bold text-[#2D1B36]">{value}</p></div>; }
function TimelineItem({ label, complete }: { label: string; complete: boolean }) { return <div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${complete ? "bg-[#3F7D63]" : "border-2 border-[#C9C1C8] bg-white"}`} /><span className={`text-sm ${complete ? "font-bold text-[#2D1B36]" : "text-[#8A818C]"}`}>{label}</span></div>; }