"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildPatternClusters, PatternReport } from "../../lib/pattern-engine";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

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
        const response = await fetch("/api/reports?view=authority");
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load reports for the map.");
          return;
        }

        setReports(result.reports ?? []);
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

  const patternReports: PatternReport[] = useMemo(() => {
    return reports.map((r) => ({
      id: r.id,
      report_id: r.report_id,
      category: r.category,
      description: r.description,
      location_name: r.location_name,
      location_label: r.location_label,
      latitude: r.latitude,
      longitude: r.longitude,
      incident_time: r.incident_time,
      status: r.status,
    }));
  }, [reports]);

  const clusters = useMemo(() => buildPatternClusters(patternReports), [patternReports]);
  const primaryPattern = clusters[0] ?? null;
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
  const risingPercent = primaryPattern?.risingPercent ?? 0;
  const isRising = primaryPattern && risingPercent > 0;

  const signalDetails = [
    { label: "Location consistency", value: `${locationConsistency}%` },
    { label: "Time consistency", value: `${timeConsistency}%` },
    { label: "Behaviour consistency", value: `${behaviourConsistency}%` },
    { label: "Category consistency", value: `${categoryConsistency}%` },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-8 py-6 text-slate-400">
          Loading authority map from SafeSignal...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-xl font-bold text-red-300">Unable to load authority map</h1>
          <p className="mt-3 text-red-200">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
              SafeSignal / Authority Map
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Understand the signal geographically
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Live geographic visualization of connected anonymous safety reports for human review.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800"
            >
              <span aria-hidden="true">←</span>
              Back to Dashboard
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:py-8">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Report cluster
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {primaryPattern?.label || (reports.length > 0 ? "All Reports" : "No Reports")}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              {relatedReports.length > 0
                ? `${relatedReports.length} connected reports`
                : `${reports.length} total reports`}
            </div>
          </div>

          <div className="h-[clamp(360px,48vh,560px)] w-full bg-[#10211f]">
            <MapView
              reports={reports}
              primaryClusterReportIds={primaryClusterReportIds}
              focusCoordinates={focusCoordinates}
              focusLabel={focusLabel}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 px-5 py-4 text-xs text-slate-400 sm:px-6">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Related report
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Independent report
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Focus location
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-5 rounded-full border border-dashed border-amber-400" />
              Highlighted area
            </span>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900 p-5 shadow-xl shadow-black/10 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Emerging pattern
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {primaryPattern?.label || "No active pattern"}
                </h2>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wider ${
                  isRising
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-slate-700 bg-slate-800 text-slate-400"
                }`}
              >
                {isRising ? "RISING" : "MONITORING"}
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
                label="Recent Activity"
                value={`${recentCount} reports`}
                accent={isRising ? "amber" : "default"}
              />
              <Metric label="Previous Activity" value={`${previousCount} reports`} />
            </div>

            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                Review message
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {primaryPattern
                  ? "Possible emerging pattern — human review recommended."
                  : "No emerging pattern currently detected in geographic reports."}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <h2 className="text-lg font-bold">Why this area is connected</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              SafeSignal connects reports using consistent location, timing, behaviour, and incident category signals.
            </p>

            <div className="mt-5 space-y-3">
              {signalDetails.map((signal) => (
                <div key={signal.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{signal.label}</span>
                    <span className="font-semibold text-slate-200">{signal.value}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: signal.value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
            <p className="text-sm font-semibold text-amber-400">Review boundary</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
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
    default: "text-white",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  }[accent];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs leading-5 text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}