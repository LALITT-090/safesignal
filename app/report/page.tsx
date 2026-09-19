"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LocationPicker, { LocationSelection } from "./location-picker";

const categories = [
  "Harassment",
  "Following/Stalking",
  "Threat",
  "Unsafe Location",
  "Assault",
  "Other",
];

function generateReportId() {
  return `SS-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

export default function ReportPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [otherCategoryDetail, setOtherCategoryDetail] = useState("");
  const [description, setDescription] = useState("");
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [timeChoice, setTimeChoice] = useState<"current" | "custom">("current");
  const [selectedDateTime, setSelectedDateTime] = useState("");
  const [reportId, setReportId] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [detailDraft, setDetailDraft] = useState("");
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function validateForm() {
    if (!category) {
      return "Please select what happened.";
    }

    if (category === "Other" && !otherCategoryDetail.trim()) {
      return "Please tell us what happened.";
    }

    if (!locationSelection) {
      return "Please select and confirm an incident location.";
    }

    if (timeChoice === "custom" && !selectedDateTime) {
      return "Please choose a date and time.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setLoading(true);

    let incidentTime = new Date().toISOString();
    if (timeChoice === "custom" && selectedDateTime) {
      const parsedTime = new Date(selectedDateTime);
      if (Number.isNaN(parsedTime.getTime())) {
        setError("Please choose a valid date and time.");
        setLoading(false);
        return;
      }
      incidentTime = parsedTime.toISOString();
    }

    const resolvedDescription = description.trim();
    const otherDetails = otherCategoryDetail.trim();
    const combinedDescription = [
      category === "Other" && otherDetails ? otherDetails : null,
      resolvedDescription || null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const payload = {
      category,
      location_name: locationSelection?.label || "Location unavailable",
      location_label: locationSelection?.label || "Location unavailable",
      latitude: locationSelection?.latitude ?? null,
      longitude: locationSelection?.longitude ?? null,
      incident_time: incidentTime,
      description: combinedDescription || "",
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit your report.");
      }

      setReportId(result.report_id || generateReportId());
      setSubmittedAt(new Date(incidentTime).toLocaleString());
      setDetailDraft("");
      setShowAddDetails(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDetails() {
    if (!reportId) {
      return;
    }

    setDetailError("");
    setIsSavingDetails(true);

    try {
      const response = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          description: detailDraft.trim() || "",
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save the description.");
      }

      setShowAddDetails(false);
      setDetailDraft("");
    } catch (saveError) {
      setDetailError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the description."
      );
    } finally {
      setIsSavingDetails(false);
    }
  }

  if (reportId) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl">✓</div>
          <h1 className="mt-6 text-3xl font-bold">Report submitted anonymously</h1>
          <p className="mt-3 text-slate-400">You can add more details later.</p>

          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <p className="text-sm text-slate-400">Report ID</p>
            <p className="mt-2 text-3xl font-bold tracking-widest text-emerald-400">{reportId}</p>
          </div>

          <div className="mt-6 space-y-3 text-left text-sm text-slate-400">
            <p>📍 {locationSelection?.label || "Location selected"}</p>
            <p>🕒 {timeChoice === "current" ? "Current time used" : "Selected time recorded"}</p>
            <p>🕐 Submitted: {submittedAt}</p>
          </div>

          {showAddDetails ? (
            <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-950 p-5 text-left">
              <label className="mb-2 block text-sm font-medium text-white">Additional description</label>
              <textarea
                value={detailDraft}
                onChange={(event) => setDetailDraft(event.target.value)}
                placeholder="Describe what happened, what you noticed, or any other useful detail..."
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
              />
              {detailError && <p className="mt-3 text-sm text-red-300">{detailError}</p>}
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={isSavingDetails}
                className="mt-4 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingDetails ? "Saving..." : "Save Description"}
              </button>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowAddDetails(true)}
                className="min-h-12 flex-1 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Add details later
              </button>
              <button
                type="button"
                onClick={() => router.push(`/report/status/${reportId}`)}
                className="min-h-12 flex-1 rounded-xl border border-slate-700 px-6 py-3 font-semibold transition hover:bg-slate-800"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 sm:mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">SafeSignal</p>
          <h1 className="mt-3 text-4xl font-bold">Report an incident</h1>
          <p className="mt-3 text-slate-400">Reports are anonymous. Share only what feels safe to share.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="category">What happened?</label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
            >
              <option value="">Select a category</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            {category === "Other" && (
              <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="other-category">Tell us what happened</label>
                <input
                  id="other-category"
                  value={otherCategoryDetail}
                  onChange={(event) => setOtherCategoryDetail(event.target.value)}
                  placeholder="Describe the incident type"
                  className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="mt-1 text-sm text-slate-400">Choose where the incident happened.</p>
              </div>
              <span className="text-xl" aria-hidden="true">⌖</span>
            </div>

            {locationSelection ? (
              <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Selected location</p>
                  <p className="mt-1 font-semibold text-white">{locationSelection.label}</p>
                  {locationSelection.accuracy !== null && <p className="mt-1 text-xs text-slate-300">Accuracy approximately {Math.round(locationSelection.accuracy)} m</p>}
                </div>
                <button type="button" onClick={() => setLocationPickerOpen(true)} className="min-h-11 rounded-xl border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15">Change</button>
              </div>
            ) : (
              <button type="button" onClick={() => setLocationPickerOpen(true)} className="mt-4 flex min-h-14 w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 text-left font-semibold text-slate-200 transition hover:border-emerald-500/60 hover:bg-slate-800">
                <span>Select location</span>
                <span className="text-slate-400" aria-hidden="true">→</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
            <p className="text-sm font-medium">Time</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3">
                <input type="radio" checked={timeChoice === "current"} onChange={() => setTimeChoice("current")} name="timeChoice" />
                <span>Use current time</span>
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3">
                <input type="radio" checked={timeChoice === "custom"} onChange={() => setTimeChoice("custom")} name="timeChoice" />
                <span>Select date &amp; time</span>
              </label>
            </div>
            {timeChoice === "custom" && <input type="datetime-local" value={selectedDateTime} onChange={(event) => setSelectedDateTime(event.target.value)} className="mt-4 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500" />}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell us what happened, if you feel comfortable..."
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
            <p className="mt-2 text-xs text-slate-400">You can submit now and add details later.</p>
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Submitting..." : "Submit anonymously"}
          </button>
          <p className="text-center text-sm text-slate-400">No name, phone number or email is required.</p>
        </form>
      </div>

      {locationPickerOpen && (
        <LocationPicker
          initialSelection={locationSelection}
          onClose={() => setLocationPickerOpen(false)}
          onConfirm={(selection) => {
            setLocationSelection(selection);
            setLocationPickerOpen(false);
            setError("");
          }}
        />
      )}
    </main>
  );
}
