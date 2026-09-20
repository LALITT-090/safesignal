"use client";

import { useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";

export type MapReport = {
  id: string | number;
  report_id: string;
  category?: string | null;
  description?: string | null;
  location_name?: string | null;
  location_label?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  incident_time?: string | null;
  status?: string | null;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

type MapViewProps = {
  reports: MapReport[];
  primaryClusterReportIds?: Set<string>;
  focusCoordinates?: [number, number] | null;
  focusLabel?: string | null;
};

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

export default function MapView({
  reports,
  primaryClusterReportIds,
  focusCoordinates,
  focusLabel,
}: MapViewProps) {
  const validReports = useMemo(() => {
    return reports.filter(
      (report) =>
        typeof report.latitude === "number" &&
        typeof report.longitude === "number" &&
        Number.isFinite(report.latitude) &&
        Number.isFinite(report.longitude)
    );
  }, [reports]);

  const center: [number, number] = useMemo(() => {
    if (focusCoordinates) {
      return focusCoordinates;
    }
    if (validReports.length > 0) {
      const avgLat =
        validReports.reduce((sum, r) => sum + (r.latitude ?? 0), 0) /
        validReports.length;
      const avgLng =
        validReports.reduce((sum, r) => sum + (r.longitude ?? 0), 0) /
        validReports.length;
      return [avgLat, avgLng];
    }
    return DEFAULT_CENTER;
  }, [focusCoordinates, validReports]);

  const zoom = focusCoordinates || validReports.length > 0 ? 14 : 5;

  if (validReports.length === 0) {
    return (
      <div className="relative h-full w-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={5}
          scrollWheelZoom
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
        </MapContainer>
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#2D1B36]/35 p-6 text-center">
          <div className="max-w-md rounded-2xl border border-[#E7E0E3] bg-[#FFFFFF]/95 p-6 shadow-[0_18px_32px_rgba(67,42,82,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              No Geographic Data
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">
              No reports with coordinates available
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              When public reports are submitted with a map location or GPS, they will appear here live.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ZoomControl position="bottomright" />
      <MapRecenter center={center} zoom={zoom} />

      {focusCoordinates && (
        <Circle
          center={focusCoordinates}
          radius={500}
          pathOptions={{
            color: "#f59e0b",
            fillColor: "#f59e0b",
            fillOpacity: 0.13,
            weight: 2,
            dashArray: "7 8",
          }}
        />
      )}

      {validReports.map((report) => {
        const isRelated = primaryClusterReportIds
          ? primaryClusterReportIds.has(report.report_id)
          : false;

        const position: [number, number] = [
          report.latitude!,
          report.longitude!,
        ];

        return (
          <CircleMarker
            key={report.report_id || report.id}
            center={position}
            radius={isRelated ? 9 : 7}
            pathOptions={{
              color: isRelated ? "#062e2a" : "#0f172a",
              fillColor: isRelated ? "#34d399" : "#94a3b8",
              fillOpacity: 0.95,
              weight: isRelated ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {report.report_id}
            </Tooltip>
            <Popup className="safesignal-popup" maxWidth={300}>
              <div className="min-w-[220px]">
                <div className="flex items-start justify-between gap-4 border-b border-slate-700 pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#432A52]">
                      Anonymous report
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {report.report_id}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {report.category || "Incident"}
                    </span>
                    {report.status && (
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[9px] font-medium text-slate-300">
                        {report.status}
                      </span>
                    )}
                  </div>
                </div>

                <dl className="mt-3 space-y-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Location</dt>
                    <dd className="mt-0.5 text-slate-200">
                      {report.location_label ||
                        report.location_name ||
                        "Location unavailable"}
                    </dd>
                  </div>
                  {report.description && (
                    <div>
                      <dt className="text-slate-500">Description</dt>
                      <dd className="mt-0.5 line-clamp-3 leading-5 text-slate-200">
                        {report.description}
                      </dd>
                    </div>
                  )}
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-slate-500">Time</dt>
                    <dd className="text-right text-slate-200">
                      {report.incident_time
                        ? new Date(report.incident_time).toLocaleString()
                        : "Not recorded"}
                    </dd>
                  </div>
                </dl>

                {isRelated ? (
                  <p className="mt-3 border-t border-slate-700 pt-2 text-xs font-semibold text-amber-300">
                    Related to active pattern
                  </p>
                ) : (
                  <p className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-400">
                    Individual safety report
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {focusCoordinates && focusLabel && (
        <CircleMarker
          center={focusCoordinates}
          radius={11}
          pathOptions={{
            color: "#fef3c7",
            fillColor: "#f59e0b",
            fillOpacity: 1,
            weight: 4,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]}>
            {focusLabel}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}