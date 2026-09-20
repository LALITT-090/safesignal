"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { isAuthorityUser } from "../../lib/supabase/authority";

type AuthorityAlertRecord = {
  id: string;
  title: string | null;
  severity: string | null;
  status: string | null;
  risk_score: number | null;
  report_count: number | null;
  independent_reporter_signals: number | null;
  activity_change_percent: number | null;
  general_location: string | null;
  explanation: string | null;
  requires_human_review: boolean | null;
  created_at: string | null;
};

export default function OperationsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AuthorityAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isAuthorityUser(user)) {
        router.replace("/login?next=/operations");
        return;
      }

      try {
        const response = await fetch("/api/alerts");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Unable to load authority alerts.");
        }

        if (active) {
          setAlerts(Array.isArray(result.alerts) ? result.alerts : []);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load authority alerts."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();

    return () => {
      active = false;
    };
  }, [router]);

  const actionSummary = useMemo(
    () =>
      alerts.length === 0
        ? "No active authority alerts are currently available."
        : `${alerts.length} active alert${alerts.length === 1 ? "" : "s"} require review.`,
    [alerts.length]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-[#3B3540]">
        <div className="safe-card px-8 py-6 text-[#5E5967]">Loading operations alerts...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-[#FAF8F5] p-8 text-[#3B3540]">
        <div className="page-shell max-w-2xl rounded-3xl border border-[#FECACA] bg-[#FEF2F2] p-8">
          <h1 className="text-xl font-extrabold text-[#B91C1C]">Unable to load alerts</h1>
          <p className="mt-3 text-[#7F1D1D]">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#FAF8F5] py-10 text-[#3B3540] md:py-12">
      <div className="page-shell">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#432A52]">Operations</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">
              Alerts
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E7E0E3] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#432A52]">
            {alerts.length > 0 ? `${alerts.length} requiring attention` : "Monitoring"}
          </div>
        </div>

        <section className="mb-8 safe-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "New", active: true },
              { label: "Acknowledged", active: false },
              { label: "Resolved", active: false },
            ].map((tab) => (
              <button
                type="button"
                key={tab.label}
                disabled
                className={[
                  "rounded-full border px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em]",
                  tab.active
                    ? "border-[#432A52] bg-[#432A52] text-white"
                    : "border-[#E7E0E3] bg-white text-[#432A52] opacity-80",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#5E5967]">{actionSummary}</p>
        </section>

        {alerts.length === 0 ? (
          <section className="safe-card p-6 text-[#5C628F]">
            No active authority alerts are currently present. The system is monitoring for connected patterns and elevated risk signals.
          </section>
        ) : (
          <div className="space-y-6">
            {alerts.map((alert) => (
              <article key={alert.id} className="safe-card p-6 md:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#432A52]">Alert</p>
                    <h2 className="mt-2 text-2xl font-extrabold text-[#2D1B36]">
                      {alert.title || "Authority alert"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`status-badge ${alert.severity === "high" ? "status-badge--high" : "status-badge--medium"}`}>
                      {alert.severity || "elevated"}
                    </span>
                    <span className="status-badge status-badge--low">
                      {alert.status || "new"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Risk score" value={String(alert.risk_score ?? 0)} />
                  <MetricCard label="Report count" value={String(alert.report_count ?? 0)} />
                  <MetricCard label="Independent signals" value={String(alert.independent_reporter_signals ?? 0)} />
                  <MetricCard label="Activity change" value={`${alert.activity_change_percent ?? 0}%`} />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <InfoRow label="General location" value={alert.general_location || "Location unavailable"} />
                  <InfoRow label="Human review required" value={alert.requires_human_review ? "Yes" : "No"} />
                </div>

                <div className="mt-6 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">Why this was surfaced</p>
                  <p className="mt-2 text-sm leading-7 text-[#5E5967]">
                    {alert.explanation || "No explanation available for this alert."}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-[#5C628F]">
                    <span className="font-bold text-[#2F3273]">Created:</span>{" "}
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : "Not recorded"}
                  </div>
                  <div className="text-sm text-[#5C628F]">
                    <span className="font-bold text-[#2F3273]">Status:</span> {alert.status || "new"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="mt-8 safe-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#432A52]">Human review</p>
          <h3 className="mt-2 text-xl font-extrabold text-[#2D1B36]">Review recommendation</h3>
          <p className="mt-3 text-sm leading-7 text-[#5E5967]">
            SafeSignal surfaces rising reported safety activity for human review. This helps authorities assess corroboration support and whether the pattern warrants a response without over-claiming certainty.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled className="primary-btn opacity-60">
              Review alert
            </button>
            <button type="button" disabled className="secondary-btn opacity-60">
              Defer
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#2D1B36]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">{label}</p>
      <p className="mt-2 text-base font-bold text-[#2D1B36]">{value}</p>
    </div>
  );
}
