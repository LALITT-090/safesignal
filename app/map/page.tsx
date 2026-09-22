"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PatternCluster } from "../../lib/pattern-engine";
import { isAuthorityUser } from "../../lib/supabase/authority";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import type { MapReport } from "./map-view";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#10211f] text-sm text-slate-400">
      Loading authority map...
    </div>
  ),
});

export default function AuthorityMapPage() {
  const router = useRouter();
  const [reports, setReports] = useState<MapReport[]>([]);
  const [clusters, setClusters] = useState<PatternCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isAuthorityUser(user)) {
        router.replace("/login?next=/map");
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("/api/authority/overview");
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load reports for the map.");
          return;
        }

        setReports(result.reports ?? []);
        setClusters(result.patterns ?? []);
      } catch (loadError) {
        console.error(loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to connect to the reports API."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, [router]);

  const [selectedPatternGroupId, setSelectedPatternGroupId] = useState<string | null>(null);
  const effectiveSelectedPatternGroupId = selectedPatternGroupId ?? clusters[0]?.patternGroupId ?? null;

  const primaryPattern = useMemo(
    () => clusters.find((cluster) => cluster.patternGroupId === effectiveSelectedPatternGroupId) ?? null,
    [clusters, effectiveSelectedPatternGroupId]
  );
  const relatedReports = useMemo(
    () => primaryPattern?.reports ?? [],
    [primaryPattern]
  );
  const primaryClusterReportIds = useMemo(
    () => new Set(relatedReports.map((r) => r.report_id)),
    [relatedReports]
  );

  const focusReport = useMemo(() => {
    return relatedReports.find(
      (r) =>
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude)
    ) ?? null;
  }, [relatedReports]);

  const focusCoordinates: [number, number] | null = focusReport
    ? [focusReport.latitude!, focusReport.longitude!]
    : null;

  const focusLabel = primaryPattern?.label ?? null;

  const locationConsistency = primaryPattern?.locationSimilarity ?? 0;
  const timeConsistency = primaryPattern?.timeSimilarity ?? 0;
  const behaviourConsistency = primaryPattern?.behaviourSimilarity ?? 0;
  const categoryConsistency = primaryPattern?.categorySimilarity ?? 0;
  const corroborationScore = primaryPattern?.corroborationScore ?? 0;
  const recentCount = primaryPattern?.recentCount ?? 0;
  const previousCount = primaryPattern?.previousCount ?? 0;
  const risingPercent = primaryPattern?.risingPercent ?? null;
  const isRising = Boolean(primaryPattern && typeof risingPercent === "number" && risingPercent > 0);

  const signalDetails = [
    { label: "Location consistency", value: `${locationConsistency}%` },
    { label: "Time consistency", value: `${timeConsistency}%` },
    { label: "Behaviour consistency", value: `${behaviourConsistency}%` },
    { label: "Category consistency", value: `${categoryConsistency}%` },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-[#3B3540]">
        <div className="rounded-2xl border border-[#E7E0E3] bg-white px-8 py-6 text-[#5E5967]">
          Loading authority map from SafeSignal...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] p-8 text-[#3B3540]">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#E7E0E3] bg-[#FFF9F8] p-8">
          <h1 className="text-xl font-bold text-[#B94A48]">Unable to load authority map</h1>
          <p className="mt-3 text-[#7D5F6E]">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#3B3540]">
      <div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:py-8">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#E7E0E3] bg-white shadow-[0_18px_32px_rgba(67,42,82,0.04)]">
          <div className="flex flex-col gap-3 border-b border-[#E7E0E3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#432A52]">
                Report cluster
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#2D1B36]">
                {primaryPattern?.label || (reports.length > 0 ? "All report clusters" : "No reports")}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#5E5967]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3F7D63] shadow-[0_0_12px_rgba(63,125,99,0.4)]" />
              {relatedReports.length > 0
                ? `${relatedReports.length} connected reports`
                : `${reports.length} total reports`}
            </div>
          </div>

          <div className="h-[clamp(360px,48vh,560px)] w-full bg-[#F4F0ED]">
            <MapView
              reports={reports}
              primaryClusterReportIds={primaryClusterReportIds}
              focusCoordinates={focusCoordinates}
              focusLabel={focusLabel}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#E7E0E3] px-5 py-4 text-xs text-[#5E5967] sm:px-6">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3F7D63]" />
              Related report
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9E9AA3]" />
              Independent report
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C58A32]" />
              Focus location
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-5 rounded-full border border-dashed border-[#C58A32]" />
              Highlighted area
            </span>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#E7E0E3] bg-white p-5 shadow-[0_18px_32px_rgba(67,42,82,0.04)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C58A32]">
                  Emerging pattern
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#2D1B36]">
                  {primaryPattern?.label || "No active pattern"}
                </h2>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wider ${
                  isRising
                    ? "border-[#F3D79E] bg-[#FFF7E8] text-[#C58A32]"
                    : "border-[#E7E0E3] bg-[#FAF8F5] text-[#5E5967]"
                }`}
              >
                {risingPercent === null ? "NEW" : isRising ? "RISING" : "MONITORING"}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric label="Related Reports" value={String(relatedReports.length)} />
              <Metric
                label="Corroboration Indicator"
                value={`${corroborationScore}/100`}
                accent="emerald"
              />
              <Metric
                label="Recent activity"
                value={`${recentCount} reports`}
                accent={isRising ? "amber" : "default"}
              />
              <Metric label="Previous activity" value={`${previousCount} reports`} />
            </div>

            <div className="mt-5 rounded-xl border border-[#F0D9A1] bg-[#FFF7E8] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C58A32]">
                Review message
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5E5967]">
                {primaryPattern
                  ? risingPercent === null
                    ? primaryPattern.suspicious ? "Possible reporting manipulation requires human review." : "New safety activity detected."
                    : primaryPattern.suspicious ? "Possible reporting manipulation requires human review." : "Safety activity is increasing in this area."
                  : "No active report cluster currently needs attention."}
              </p>
              {clusters.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {clusters.map((cluster) => (
                    <button
                      key={cluster.patternGroupId}
                      type="button"
                      onClick={() => setSelectedPatternGroupId(cluster.patternGroupId)}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        cluster.patternGroupId === primaryPattern?.patternGroupId
                          ? "border-[#432A52] bg-[#432A52] text-white"
                          : "border-[#E7E0E3] bg-white text-[#432A52]"
                      }`}
                    >
                      {cluster.label}
                    </button>
                  ))}
                </div>
              )}
              {primaryPattern && (
                <button
                  type="button"
                  onClick={() => router.push(primaryPattern.suspicious
                    ? `/reviews?patternGroupId=${encodeURIComponent(primaryPattern.patternGroupId)}`
                    : `/patterns/${encodeURIComponent(primaryPattern.patternGroupId)}`)}
                  className="mt-4 rounded-full border border-[#432A52] bg-[#432A52] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white"
                >
                  View Cluster
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E7E0E3] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-[#2D1B36]">Why this area is connected</h2>
            <p className="mt-3 text-sm leading-6 text-[#5E5967]">
              SafeSignal connects reports using consistent location, timing, behaviour, and incident category signals.
            </p>

            <div className="mt-5 space-y-3">
              {signalDetails.map((signal) => (
                <div key={signal.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5E5967]">{signal.label}</span>
                    <span className="font-semibold text-[#2D1B36]">{signal.value}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E7E0E3]">
                    <div
                      className="h-full rounded-full bg-[#3F7D63]"
                      style={{ width: signal.value }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {primaryPattern && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Metric label="Safety level" value={`${primaryPattern.safetyRiskScore}/100`} />
                <Metric label="Reporting concern" value={String(primaryPattern.manipulationScore)} />
                <Metric label="Different reporters" value={String(primaryPattern.reporterDiversity)} />
                <Metric label="Location" value={primaryPattern.locationName} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#F0D9A1] bg-[#FFF7E8] p-5 sm:p-6">
            <p className="text-sm font-semibold text-[#C58A32]">Review boundary</p>
            <p className="mt-2 text-sm leading-6 text-[#5E5967]">
              This is a review signal, not a determination of truth, guilt, identity, or responsibility.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "emerald" | "amber";
}) {
  const valueColor = {
    default: "text-[#2D1B36]",
    emerald: "text-[#3F7D63]",
    amber: "text-[#C58A32]",
  }[accent];

  return (
    <div className="rounded-xl border border-[#E7E0E3] bg-[#FAF8F5] p-4">
      <p className="text-xs leading-5 text-[#5E5967]">{label}</p>
      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}