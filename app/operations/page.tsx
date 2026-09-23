"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { isAuthorityUser } from "../../lib/supabase/authority";

type AuthorityAlertRecord = {
  id: string;
  pattern_group_id: string;
  title: string | null;
  status: "new" | "acknowledged" | "resolved" | null;
  risk_score: number | null;
  manipulation_score: number | null;
  report_count: number | null;
  independent_reporter_signals: number | null;
  activity_change_percent: number | null;
  general_location: string | null;
  explanation: string | null;
  requires_human_review: boolean;
  pattern_group_unresolved: boolean;
};

type Filter = "new" | "acknowledged" | "resolved";

export default function OperationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("new");
  const [alerts, setAlerts] = useState<AuthorityAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlerts = useCallback(async (nextFilter = filter) => {
    const response = await fetch(`/api/alerts?status=${nextFilter}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error || "Unable to load authority alerts.");
    setAlerts(Array.isArray(result.alerts) ? result.alerts : []);
  }, [filter]);

  useEffect(() => {
    async function authorizeAndLoad() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAuthorityUser(user)) {
        router.replace("/login?next=/operations");
        return;
      }
      try {
        await loadAlerts();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load authority alerts.");
      } finally {
        setLoading(false);
      }
    }
    void authorizeAndLoad();
  }, [loadAlerts, router]);

  async function updateStatus(id: string, status: Filter) {
    const response = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error || "Unable to update alert status.");
    await loadAlerts();
  }

  const safetyAlerts = useMemo(() => alerts.filter((alert) => alert.title === "Rising reported safety activity"), [alerts]);
  const reviewAlerts = useMemo(() => alerts.filter((alert) => alert.requires_human_review || alert.title === "Possible reporting manipulation"), [alerts]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">Loading alerts...</main>;
  if (error) return <main className="bg-[#FAF8F5] p-8 text-[#B91C1C]">{error}</main>;

  return (
    <main className="bg-[#FAF8F5] py-10 text-[#3B3540] md:py-12">
      <div className="page-shell">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#432A52]">Authority alerts</p><h1 className="mt-2 text-3xl font-extrabold text-[#2D1B36]">Alerts</h1></div>
          <span className="status-badge status-badge--low">{filter}</span>
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          {(["new", "acknowledged", "resolved"] as Filter[]).map((status) => (
            <button key={status} type="button" onClick={() => { setFilter(status); void loadAlerts(status); }} className={`rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] ${filter === status ? "border-[#432A52] bg-[#432A52] text-white" : "border-[#E7E0E3] bg-white text-[#432A52]"}`}>{status}</button>
          ))}
        </div>
        <AlertSection title="Safety alerts" empty="No active safety alerts." alerts={safetyAlerts} review={false} onStatusChange={updateStatus} />
        <AlertSection title="Reporting review" empty="No report cluster is currently awaiting reporting review." alerts={reviewAlerts} review onStatusChange={updateStatus} />
      </div>
    </main>
  );
}

function AlertSection({ title, empty, alerts, review, onStatusChange }: { title: string; empty: string; alerts: AuthorityAlertRecord[]; review: boolean; onStatusChange: (id: string, status: Filter) => Promise<void> }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-extrabold text-[#2F3273]">{title}</h2>
      {alerts.length === 0 ? <div className="safe-card p-6 text-[#5E5967]">{empty}</div> : <div className="space-y-5">{alerts.map((alert) => {
        const hasPatternGroup = Boolean(alert.pattern_group_id);
        return (
          <article key={alert.id} className="safe-card p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#432A52]">{alert.pattern_group_id || "No cluster"}</p><h3 className="mt-2 text-2xl font-extrabold text-[#2D1B36]">{review ? "Possible Reporting Manipulation" : "Safety Alert"}</h3></div><span className="status-badge status-badge--medium">{alert.status}</span></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Location" value={alert.general_location || "Location unavailable"} /><Metric label="Related reports" value={String(alert.report_count ?? 0)} /><Metric label="Different reporters" value={String(alert.independent_reporter_signals ?? 0)} /><Metric label="Safety level" value={`${alert.risk_score ?? 0}/100`} /><Metric label="Reporting concern" value={review ? "HIGH" : String(alert.manipulation_score ?? 0)} /></div>
            <p className="mt-5 text-sm leading-7 text-[#5E5967]">{review ? "These reports show signs of possible reporting manipulation or coordinated reporting behaviour. Human review is required before deciding whether further action is appropriate." : alert.explanation || "Reported activity is rising above the configured threshold."}</p>
            <div className="mt-5 flex flex-wrap gap-3">{alert.pattern_group_unresolved ? <span className="rounded-full border border-[#E7E0E3] bg-[#FAF8F5] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#5E5967]">Cluster details unavailable for this historical alert</span> : hasPatternGroup ? <Link href={review ? `/reviews?patternGroupId=${encodeURIComponent(alert.pattern_group_id)}` : `/patterns/${encodeURIComponent(alert.pattern_group_id)}`} className="primary-btn">{review ? "Review" : "View Alert"}</Link> : <span className="rounded-full border border-[#E7E0E3] bg-[#FAF8F5] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#5E5967]">No cluster link</span>}{alert.status === "new" && <button type="button" onClick={() => void onStatusChange(alert.id, "acknowledged")} className="secondary-btn">Acknowledge</button>}{alert.status === "acknowledged" && <button type="button" onClick={() => void onStatusChange(alert.id, "resolved")} className="secondary-btn">Resolve</button>}</div>
          </article>
        );
      })}</div>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#432A52]">{label}</p><p className="mt-2 text-lg font-extrabold text-[#2D1B36]">{value}</p></div>;
}