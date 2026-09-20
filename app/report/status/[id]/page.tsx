"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type ReportStatusResult = {
  id: string;
  report_id: string;
  category: string | null;
  description: string | null;
  location_name: string | null;
  location_label: string | null;
  incident_time: string | null;
  status: string | null;
};

const validStatusLabels: Record<string, string> = {
  submitted: "Submitted",
  connected: "Connected",
  under_review: "Under review",
  reviewed: "Reviewed",
};

export default function DynamicReportStatusPage() {
  const params = useParams<{ id?: string }>();
  const initialId = typeof params?.id === "string" ? params.id : "";
  const [reportId, setReportId] = useState(initialId);
  const [report, setReport] = useState<ReportStatusResult | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(Boolean(initialId));
  const [saving, setSaving] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const currentStatusLabel = useMemo(() => {
    if (!report?.status) {
      return "Submitted";
    }

    return validStatusLabels[report.status] || "Submitted";
  }, [report?.status]);

  async function lookupReport(reportIdToLookup: string) {
    const normalizedId = reportIdToLookup.trim();

    if (!normalizedId) {
      setLookupError("Enter your Report ID.");
      setReport(null);
      return;
    }

    setLoading(true);
    setLookupError("");
    setSaveError("");
    setSaved(false);

    try {
      const response = await fetch(
        `/api/reports?report_id=${encodeURIComponent(normalizedId)}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to find this report.");
      }

      if (!result?.report) {
        throw new Error("No report was found for that ID.");
      }

      const nextReport = result.report;
      setReport(nextReport);
      setDescription(nextReport.description ?? "");
      setReportId(nextReport.report_id || normalizedId);
    } catch (error) {
      setReport(null);
      setLookupError(
        error instanceof Error
          ? error.message
          : "Unable to find this report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/reports?report_id=${encodeURIComponent(initialId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Unable to find this report.");
        }

        if (!result?.report) {
          throw new Error("No report was found for that ID.");
        }

        if (cancelled) {
          return;
        }

        const nextReport = result.report;
        setReport(nextReport);
        setDescription(nextReport.description ?? "");
        setReportId(nextReport.report_id || initialId);
        setLookupError("");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setReport(null);
        setLookupError(
          error instanceof Error
            ? error.message
            : "Unable to find this report."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialId]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupReport(reportId);
  }

  async function handleSaveDescription() {
    const normalizedId = reportId.trim();

    if (!normalizedId) {
      setSaveError("Enter your Report ID first.");
      return;
    }

    if (!report) {
      setSaveError("Find the report before saving additional details.");
      return;
    }

    setSaveError("");
    setSaving(true);

    try {
      const response = await fetch("/api/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_id: normalizedId,
          description: description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save the description.");
      }

      const refreshed = await fetch(
        `/api/reports?report_id=${encodeURIComponent(normalizedId)}`
      );
      const refreshedResult = await refreshed.json();

      if (!refreshed.ok || !refreshedResult?.report) {
        throw new Error("The report was saved, but could not be reloaded.");
      }

      setReport(refreshedResult.report);
      setDescription(refreshedResult.report.description ?? "");
      setSaved(true);
    } catch (error) {
      setSaved(false);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save the description."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="bg-[#FAF8F5] px-4 py-12 text-[#3B3540] md:px-6">
      <div className="page-shell max-w-2xl">
        <div className="safe-card-strong p-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#432A52]">SafeSignal</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Report status</h1>

          <form onSubmit={handleLookup} className="mt-6 space-y-4">
            <label htmlFor="report-id" className="block text-sm font-bold text-[#2D1B36]">Your Report ID</label>
            <input
              id="report-id"
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
              placeholder="SS-XXXXXX"
              className="input-shell"
            />

            <button
              type="submit"
              disabled={loading}
              className="primary-btn w-full"
            >
              {loading ? "Checking..." : "Find Report"}
            </button>

            {lookupError && <p role="alert" className="text-sm text-[#B94A48]">{lookupError}</p>}
          </form>

          {loading && !report && (
            <div className="mt-6 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-4 text-sm text-[#5E5967]">
              Looking up your report...
            </div>
          )}

          {report && (
            <div className="mt-8 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-5">
              <div className="flex items-center justify-between gap-3 border-b border-[#E7E0E3] pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#432A52]">Report ID</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#432A52]">{report.report_id}</p>
                </div>
                <span className="status-badge status-badge--medium">
                  {currentStatusLabel}
                </span>
              </div>

              <dl className="mt-5 space-y-4 text-sm text-[#5E5967]">
                <div>
                  <dt className="text-[#432A52]">Status</dt>
                  <dd className="mt-1 font-bold text-[#2D1B36]">{currentStatusLabel}</dd>
                </div>

                <div>
                  <dt className="text-[#432A52]">Category</dt>
                  <dd className="mt-1 font-bold text-[#2D1B36]">{report.category || "Not provided"}</dd>
                </div>

                <div>
                  <dt className="text-[#432A52]">Location</dt>
                  <dd className="mt-1 font-bold text-[#2D1B36]">
                    {report.location_label || report.location_name || "Location unavailable"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[#432A52]">Submitted</dt>
                  <dd className="mt-1 font-bold text-[#2D1B36]">
                    {report.incident_time ? new Date(report.incident_time).toLocaleString() : "Not recorded"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[#432A52]">Description</dt>
                  <dd className="mt-1 whitespace-pre-wrap font-medium text-[#2D1B36]">
                    {report.description || "No description has been added yet."}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-2xl border border-[#E7E0E3] bg-white p-4">
                <label htmlFor="status-description" className="mb-2 block text-sm font-bold text-[#2D1B36]">
                  Additional description
                </label>
                <textarea
                  id="status-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  placeholder="Describe what happened, what you noticed, or any other useful detail..."
                  className="input-shell resize-none"
                />

                {saveError && <p className="mt-3 text-sm text-[#B94A48]">{saveError}</p>}
                {saved && <p className="mt-3 text-sm text-[#3F7D63]">Description saved to your report.</p>}

                <button
                  type="button"
                  onClick={handleSaveDescription}
                  disabled={saving}
                  className="primary-btn mt-4 w-full"
                >
                  {saving ? "Saving..." : "Save Description"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
