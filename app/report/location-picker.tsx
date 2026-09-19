"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Coordinate } from "./location-map";

const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <div className="h-full min-h-80 rounded-2xl border border-slate-700 bg-slate-900" />,
});

export type LocationSelection = {
  latitude: number;
  longitude: number;
  label: string;
  accuracy: number | null;
};

type SearchResult = {
  id: string;
  name: string;
  subtitle: string;
  label: string;
  latitude: number;
  longitude: number;
};

const indiaCenter: Coordinate = [20.5937, 78.9629];

function formatAccuracy(accuracy: number | null) {
  if (accuracy === null) {
    return "";
  }

  return `Accuracy: approximately ${Math.round(accuracy)} m`;
}

export default function LocationPicker({
  initialSelection,
  onClose,
  onConfirm,
}: {
  initialSelection: LocationSelection | null;
  onClose: () => void;
  onConfirm: (selection: LocationSelection) => void;
}) {
  const initialPoint: Coordinate | null = initialSelection
    ? [initialSelection.latitude, initialSelection.longitude]
    : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<Coordinate | null>(initialPoint);
  const [mapCenter, setMapCenter] = useState<Coordinate>(initialPoint || indiaCenter);
  const [mapZoom, setMapZoom] = useState(initialPoint ? 16 : 5);
  const [selectedLabel, setSelectedLabel] = useState(initialSelection?.label || "");
  const [accuracy, setAccuracy] = useState<number | null>(initialSelection?.accuracy || null);
  const [locationMessage, setLocationMessage] = useState(
    initialSelection ? "Location selected" : "Search for a place or tap the map to choose one."
  );
  const [locationError, setLocationError] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchMessage("");

      try {
        const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Location search is temporarily unavailable.");
        }

        setSearchResults(result.results || []);
        if (!result.results?.length) {
          setSearchMessage("No matching locations found.");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchMessage(
            error instanceof Error
              ? error.message
              : "Location search is temporarily unavailable."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  async function updateLabelFromPoint(point: Coordinate) {
    setLocationMessage("Location selected");
    setLocationError("");

    try {
      const response = await fetch(`/api/location/reverse?lat=${point[0]}&lon=${point[1]}`);
      const result = await response.json();

      if (response.ok && result.result?.label) {
        setSelectedLabel(result.result.label);
      } else {
        setSelectedLabel("Selected location");
      }
    } catch {
      setSelectedLabel("Selected location");
      setLocationError("We could not identify this place, but you can still use the selected location.");
    }
  }

  function handleMapSelect(point: Coordinate) {
    setSelectedPoint(point);
    setMapCenter(point);
    setMapZoom(17);
    setAccuracy(null);
    void updateLabelFromPoint(point);
  }

  function handleSearchResult(result: SearchResult) {
    const point: Coordinate = [result.latitude, result.longitude];
    setSelectedPoint(point);
    setMapCenter(point);
    setMapZoom(16);
    setSelectedLabel(result.label);
    setAccuracy(null);
    setLocationMessage("Location selected");
    setLocationError("");
    setSearchQuery("");
    setSearchResults([]);
    setSearchMessage("");
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchMessage("");
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your location couldn't be detected. Search for a location instead.");
      return;
    }

    setIsDetecting(true);
    setLocationError("");
    setLocationMessage("Finding your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: Coordinate = [position.coords.latitude, position.coords.longitude];
        setSelectedPoint(point);
        setMapCenter(point);
        setMapZoom(17);
        setAccuracy(position.coords.accuracy);
        setLocationMessage("Current location detected");
        setIsDetecting(false);
        void updateLabelFromPoint(point);
      },
      (error) => {
        setIsDetecting(false);
        setLocationMessage("");
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location access is off. Allow location access in your browser, or search for a location instead."
            : "Your location couldn't be detected. Search for a location instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function handleConfirm() {
    if (!selectedPoint) {
      setLocationError("Choose a location before confirming.");
      return;
    }

    onConfirm({
      latitude: selectedPoint[0],
      longitude: selectedPoint[1],
      label: selectedLabel || "Selected location",
      accuracy,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-picker-title"
        className="flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden bg-slate-900 shadow-2xl sm:h-[min(760px,calc(100dvh-48px))] sm:rounded-3xl sm:border sm:border-slate-700"
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">SafeSignal</p>
            <h2 id="location-picker-title" className="mt-1 text-xl font-bold text-white">Select location</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location picker"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 text-xl text-slate-300 transition hover:bg-slate-800"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative order-2 min-h-0 flex-1 p-3 sm:p-5 lg:order-1">
            {selectedPoint ? (
              <>
                <LocationMap
                  center={mapCenter}
                  zoom={mapZoom}
                  selectedPoint={selectedPoint}
                  onSelect={handleMapSelect}
                />
                <div className="pointer-events-none absolute bottom-7 left-6 rounded-full bg-slate-950/85 px-3 py-2 text-xs text-slate-300 shadow-lg sm:bottom-8 sm:left-8">
                  Tap the map or drag the pin to adjust
                </div>
              </>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-center lg:min-h-52">
                <div>
                  <p className="font-semibold text-white">Choose where this happened</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    Search for a place or use your current location. You can adjust the pin before confirming.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="order-1 flex max-h-[47%] flex-col gap-4 overflow-y-auto border-b border-slate-800 p-4 sm:p-5 lg:order-2 lg:max-h-none lg:border-b-0 lg:border-l">
            <label className="relative block">
              <span className="sr-only">Search area, street, landmark or place</span>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400" aria-hidden="true">⌕</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search area, street, landmark or place"
                className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
              />
            </label>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isDetecting}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-left text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-lg" aria-hidden="true">⌖</span>
              <span>{isDetecting ? "Finding your location..." : "Use current location"}</span>
            </button>

            {isSearching && <p role="status" className="text-sm text-slate-400">Searching locations...</p>}
            {searchMessage && <p role="status" className="rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-400">{searchMessage}</p>}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <button
                    type="button"
                    key={result.id}
                    onClick={() => handleSearchResult(result)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-left transition hover:border-emerald-500/60 hover:bg-slate-800"
                  >
                    <span className="block font-semibold text-white">{result.name}</span>
                    <span className="mt-1 block text-sm text-slate-400">{result.subtitle || "Location result"}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected location</p>
              <p className="mt-2 min-h-12 text-base font-semibold text-white">{selectedLabel || "Choose a location to continue"}</p>
              <p className="mt-2 text-sm text-slate-400">{locationMessage}</p>
              {accuracy !== null && <p className="mt-2 text-sm text-slate-400">{formatAccuracy(accuracy)}</p>}
              {accuracy !== null && accuracy > 100 && (
                <p className="mt-2 text-sm text-amber-300">Your location may be approximate. You can move the pin to the correct place.</p>
              )}
              {locationError && <p className="mt-3 text-sm text-amber-300">{locationError}</p>}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedPoint}
                className="mt-4 min-h-12 w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm location
              </button>
              {selectedPoint && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Change location
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
