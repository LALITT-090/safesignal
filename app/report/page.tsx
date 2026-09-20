"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnonymousToken } from "../../lib/anonymous-token";
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

    const anonymousToken = getAnonymousToken();

    const payload = {
      category,
      location_name: locationSelection?.label || "Location unavailable",
      location_label: locationSelection?.label || "Location unavailable",
      latitude: locationSelection?.latitude ?? null,
      longitude: locationSelection?.longitude ?? null,
      incident_time: incidentTime,
      description: combinedDescription || "",
      anonymousToken,
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
      <main className="bg-[#FAF8F5] px-4 py-12 text-[#3B3540] md:px-6">
        <div className="page-shell max-w-xl">
          <div className="safe-card-strong p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F2ECF3] text-3xl text-[#432A52]">✓</div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.03em] text-[#2D1B36]">Report submitted anonymously</h1>
            <p className="mt-3 text-[#5E5967]">You can add more details later.</p>

            <div className="mt-8 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#432A52]">Report ID</p>
              <p className="mt-2 text-3xl font-extrabold tracking-[0.18em] text-[#432A52]">{reportId}</p>
            </div>

            <div className="mt-6 space-y-3 text-left text-sm text-[#5E5967]">
              <p>📍 {locationSelection?.label || "Location selected"}</p>
              <p>🕒 {timeChoice === "current" ? "Current time used" : "Selected time recorded"}</p>
              <p>🕐 Submitted: {submittedAt}</p>
            </div>

            {showAddDetails ? (
              <div className="mt-8 rounded-2xl border border-[#E7E0E3] bg-white p-5 text-left">
                <label className="mb-2 block text-sm font-bold text-[#2D1B36]">Additional description</label>
                <textarea
                  value={detailDraft}
                  onChange={(event) => setDetailDraft(event.target.value)}
                  placeholder="Describe what happened, what you noticed, or any other useful detail..."
                  rows={5}
                  className="input-shell resize-none"
                />
                {detailError && <p className="mt-3 text-sm text-[#B91C1C]">{detailError}</p>}
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="primary-btn mt-4 w-full"
                >
                  {isSavingDetails ? "Saving..." : "Save Description"}
                </button>
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAddDetails(true)}
                  className="secondary-btn flex-1"
                >
                  Add details later
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/report/status/${reportId}`)}
                  className="primary-btn flex-1"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#FAF8F5] px-4 py-10 text-[#3B3540] md:px-6 md:py-14">
      <div className="page-shell max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#432A52]">SafeSignal</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Report an incident</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#5E5967]">
            Your report is anonymous. You do not need to provide your name or contact details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="safe-card-strong space-y-6 p-5 sm:p-8">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#2D1B36]" htmlFor="category">What happened?</label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="input-shell"
            >
              <option value="">Select a category</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            {category === "Other" && (
              <div className="mt-3">
                <label className="mb-2 block text-sm font-bold text-[#2F3273]" htmlFor="other-category">Tell us what happened</label>
                <input
                  id="other-category"
                  value={otherCategoryDetail}
                  onChange={(event) => setOtherCategoryDetail(event.target.value)}
                  placeholder="Describe the incident type"
                  className="input-shell"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#2D1B36]">Where did it happen?</p>
                <p className="mt-1 text-sm text-[#5E5967]">Choose the place most associated with the incident.</p>
              </div>
              <span className="text-xl text-[#432A52]" aria-hidden="true">⌖</span>
            </div>

            {locationSelection ? (
              <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#432A52]">Selected location</p>
                  <p className="mt-1 font-bold text-[#2D1B36]">{locationSelection.label}</p>
                  {locationSelection.accuracy !== null && <p className="mt-1 text-xs text-[#5E5967]">Accuracy approximately {Math.round(locationSelection.accuracy)} m</p>}
                </div>
                <button type="button" onClick={() => setLocationPickerOpen(true)} className="secondary-btn min-h-[44px]">Change</button>
              </div>
            ) : (
              <button type="button" onClick={() => setLocationPickerOpen(true)} className="mt-4 flex min-h-14 w-full items-center justify-between rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] px-4 text-left font-bold text-[#2D1B36] transition hover:bg-[#F2ECF3]">
                <span>Select location</span>
                <span className="text-[#432A52]" aria-hidden="true">→</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-[#E7E0E3] bg-white p-4 sm:p-5">
            <p className="text-sm font-bold text-[#2D1B36]">When did it happen?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-3 text-[#2D1B36]">
                <input type="radio" checked={timeChoice === "current"} onChange={() => setTimeChoice("current")} name="timeChoice" />
                <span>Use current time</span>
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-3 text-[#2D1B36]">
                <input type="radio" checked={timeChoice === "custom"} onChange={() => setTimeChoice("custom")} name="timeChoice" />
                <span>Select date &amp; time</span>
              </label>
            </div>
            {timeChoice === "custom" && <input type="datetime-local" value={selectedDateTime} onChange={(event) => setSelectedDateTime(event.target.value)} className="input-shell mt-4" />}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[#2D1B36]" htmlFor="description">Optional description</label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell us what happened, if you feel comfortable..."
              rows={5}
              className="input-shell resize-none"
            />
            <p className="mt-2 text-xs text-[#5E5967]">You can submit now and add details later.</p>
          </div>

          {error && <div className="rounded-2xl border border-[#E7E0E3] bg-[#FDF4F4] p-4 text-sm text-[#B94A48]">{error}</div>}

          <button type="submit" disabled={loading} className="primary-btn w-full">
            {loading ? "Submitting..." : "Submit Anonymously"}
          </button>
          <p className="text-center text-sm text-[#5E5967]">No name, phone number or email is required.</p>
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
