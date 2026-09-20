"use client";

import { FormEvent, useState } from "react";

export default function ReportStatusPage() {
  const [reportId, setReportId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reportFound, setReportFound] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupError("");
    setSaveError("");
    setSaved(false);

    if (!reportId.trim()) {
      setLookupError("Enter your Report ID.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/reports?report_id=${encodeURIComponent(reportId.trim())}`);
      const result = await response.json();

      if (!response.ok || !result.report) {
        throw new Error("No report was found for that ID.");
      }

      setReportFound(true);
      setDescription(result.report.description ?? "");
    } catch (error) {
      setReportFound(false);
      setLookupError(
        error instanceof Error ? error.message : "Unable to find this report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDescription() {
    if (!reportId.trim()) {
      setSaveError("Enter your Report ID first.");
      return;
    }

    setSaveError("");
    setLoading(true);

    try {
      const response = await fetch("/api/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_id: reportId.trim(),
          description: description.trim() || "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save the description.");
      }

      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save the description."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-[#FAF8F5] px-4 py-12 text-[#3B3540] md:px-6">
      <div className="page-shell max-w-2xl">
        <div className="safe-card-strong p-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#432A52]">SafeSignal</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Report status</h1>

          <form onSubmit={handleLookup} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-[#2D1B36]">Your Report ID</label>
            <input
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

            {lookupError && (
              <p className="text-sm text-[#B94A48]">{lookupError}</p>
            )}
          </form>

          {reportFound && (
            <div className="mt-8 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-5">
              <label className="mb-2 block text-sm font-bold text-[#2D1B36]">
                Additional description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                placeholder="Describe what happened, what you noticed, or any other useful detail..."
                className="input-shell resize-none"
              />

              {saveError && (
                <p className="mt-3 text-sm text-[#B94A48]">{saveError}</p>
              )}

              {saved && (
                <p className="mt-3 text-sm text-[#3F7D63]">
                  Description saved to your report.
                </p>
              )}

              <button
                type="button"
                onClick={handleSaveDescription}
                disabled={loading}
                className="primary-btn mt-4 w-full"
              >
                {loading ? "Saving..." : "Save Description"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
