"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { REPORTING_CONCERN_REVIEW_THRESHOLD } from "../../../lib/pattern-engine";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { isAuthorityUser } from "../../../lib/supabase/authority";

type Pattern = {
  patternGroupId: string;
  label: string;
  locationName: string;
  areaName: string;
  city: string;
  reports: Array<{ report_id: string; category?: string | null; description?: string | null; location_name?: string | null; location_label?: string | null; incident_time?: string | null; status?: string | null }>;
  reporterDiversity: number;
  safetyRiskScore: number;
  manipulationScore: number;
  risingPercent: number | null;
  connectionExplanation: string[];
};

export default function PatternDetailsPage() {
  const params = useParams<{ patternGroupId?: string }>();
  const router = useRouter();
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPattern() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAuthorityUser(user)) {
        router.replace(`/login?next=/patterns/${encodeURIComponent(params.patternGroupId ?? "")}`);
        return;
      }

      try {
        const response = await fetch(`/api/authority/patterns/${encodeURIComponent(params.patternGroupId ?? "")}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load Pattern Group.");
        const selected = result.pattern;
        if (!selected) throw new Error("The requested Pattern Group could not be found.");
        setPattern(selected);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load Pattern Group.");
      } finally {
        setLoading(false);
      }
    }

    if (params.patternGroupId) void loadPattern();
  }, [params.patternGroupId, router]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">Loading Pattern Group...</main>;
  if (error || !pattern) return <main className="bg-[#FAF8F5] p-8 text-[#B94A48]">{error || "Pattern Group unavailable."}</main>;

  return (
    <main className="bg-[#FAF8F5] py-10 text-[#3B3540] md:py-12">
      <div className="page-shell">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#432A52]">Cluster details</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#2D1B36]">Report Cluster {pattern.patternGroupId}</h1>
        <p className="mt-2 text-[#5E5967]">{pattern.locationName}{pattern.areaName && pattern.areaName !== pattern.locationName ? `, ${pattern.areaName}` : ""}{pattern.city ? `, ${pattern.city}` : ""}</p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Related reports" value={String(pattern.reports.length)} />
          <Metric label="Different reporters" value={String(pattern.reporterDiversity)} />
          <Metric label="Safety level" value={`${pattern.safetyRiskScore}/100`} />
          <Metric label="Reporting concern" value={String(pattern.manipulationScore)} />
          <Metric label="Activity" value={pattern.risingPercent === null ? "New activity" : `${pattern.risingPercent > 0 ? "+" : ""}${pattern.risingPercent}%`} />
        </section>

        <section className="mt-8 safe-card p-6"><h2 className="text-xl font-extrabold text-[#2D1B36]">Why these reports were grouped</h2><div className="mt-4 grid gap-3 md:grid-cols-5">{pattern.connectionExplanation.map((reason, index) => <div key={`${reason}-${index}`} className="rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#432A52]">{["Location", "Time", "Category", "Behaviour", "Different Reporters"][index]}</p><p className="mt-2 text-sm leading-6 text-[#5E5967]">{reason}</p></div>)}</div></section>

        <section className="mt-8"><h2 className="text-2xl font-extrabold text-[#2D1B36]">Reports in this cluster</h2><div className="mt-4 space-y-3">{pattern.reports.map((report) => <article key={report.report_id} className="safe-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><p className="font-extrabold text-[#432A52]">{report.report_id}</p><span className="status-badge status-badge--low">{report.status || "submitted"}</span></div><div className="mt-3 grid gap-3 md:grid-cols-4 text-sm"><Metric label="Category" value={report.category || "Not provided"} /><Metric label="Location" value={report.location_label || report.location_name || pattern.locationName} /><Metric label="Time" value={report.incident_time ? new Date(report.incident_time).toLocaleString() : "Not recorded"} /><Metric label="Description" value={report.description || "No description provided."} /></div></article>)}</div></section>

        {pattern.manipulationScore >= REPORTING_CONCERN_REVIEW_THRESHOLD && <Link href={`/reviews?patternGroupId=${encodeURIComponent(pattern.patternGroupId)}`} className="primary-btn mt-8 inline-flex">Review</Link>}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#432A52]">{label}</p><p className="mt-2 text-sm font-extrabold text-[#2D1B36]">{value}</p></div>; }
