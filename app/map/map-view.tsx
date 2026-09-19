"use client";

import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
} from "react-leaflet";

type Coordinate = [number, number];

type SyntheticReport = {
  id: string;
  category: string;
  description: string;
  incidentTime: string;
  position: Coordinate;
};

const universityGateTwo: Coordinate = [35.1234, -89.9876];

const syntheticReports: SyntheticReport[] = [
  { id: "SYN-UG2-001", category: "Following", description: "Anonymous report of being followed near the north walkway.", incidentTime: "14 Sep 2026, 08:15", position: [35.1251, -89.9891] },
  { id: "SYN-UG2-002", category: "Harassment", description: "Anonymous report of repeated unwanted contact near the library path.", incidentTime: "14 Sep 2026, 12:40", position: [35.1246, -89.9858] },
  { id: "SYN-UG2-003", category: "Following", description: "Anonymous report of a person following them from the transit stop.", incidentTime: "14 Sep 2026, 17:20", position: [35.1222, -89.9862] },
  { id: "SYN-UG2-004", category: "Harassment", description: "Anonymous report describing repeated unwanted comments by the east path.", incidentTime: "15 Sep 2026, 09:05", position: [35.1216, -89.9894] },
  { id: "SYN-UG2-005", category: "Following", description: "Anonymous report of being followed toward the student center.", incidentTime: "15 Sep 2026, 11:35", position: [35.1263, -89.9872] },
  { id: "SYN-UG2-006", category: "Harassment", description: "Anonymous report of unwanted contact near the south entrance.", incidentTime: "15 Sep 2026, 16:10", position: [35.1209, -89.9851] },
  { id: "SYN-UG2-007", category: "Following", description: "Anonymous report of a person following them across the central quad.", incidentTime: "15 Sep 2026, 19:45", position: [35.1239, -89.9910] },
  { id: "SYN-UG2-008", category: "Harassment", description: "Anonymous report of repeated unwanted interaction near the west gate.", incidentTime: "16 Sep 2026, 08:50", position: [35.1270, -89.9903] },
  { id: "SYN-UG2-009", category: "Following", description: "Anonymous report of being followed after leaving an evening event.", incidentTime: "16 Sep 2026, 20:25", position: [35.1199, -89.9880] },
  { id: "SYN-UG2-010", category: "Harassment", description: "Anonymous report describing unwanted contact by the south walkway.", incidentTime: "17 Sep 2026, 10:30", position: [35.1240, -89.9829] },
  { id: "SYN-UG2-011", category: "Following", description: "Anonymous report of being followed near the west parking area.", incidentTime: "17 Sep 2026, 13:15", position: [35.1212, -89.9914] },
  { id: "SYN-UG2-012", category: "Harassment", description: "Anonymous report of repeated unwanted comments near the north path.", incidentTime: "17 Sep 2026, 15:45", position: [35.1276, -89.9849] },
  { id: "SYN-UG2-013", category: "Following", description: "Anonymous report of a person following them toward the east entrance.", incidentTime: "17 Sep 2026, 18:05", position: [35.1189, -89.9848] },
  { id: "SYN-UG2-014", category: "Harassment", description: "Anonymous report of unwanted contact near the athletics path.", incidentTime: "17 Sep 2026, 21:10", position: [35.1262, -89.9920] },
];

export default function MapView() {
  return (
    <MapContainer
      center={universityGateTwo}
      zoom={15}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ZoomControl position="bottomright" />

      <Circle
        center={universityGateTwo}
        radius={530}
        pathOptions={{
          color: "#f59e0b",
          fillColor: "#f59e0b",
          fillOpacity: 0.13,
          weight: 2,
          dashArray: "7 8",
        }}
      />

      {syntheticReports.map((report) => (
        <CircleMarker
          key={report.id}
          center={report.position}
          radius={8}
          pathOptions={{
            color: "#062e2a",
            fillColor: "#34d399",
            fillOpacity: 0.95,
            weight: 3,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {report.id}
          </Tooltip>
          <Popup className="safesignal-popup" maxWidth={280}>
            <div className="min-w-[220px]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-700 pb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                    Anonymous report
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{report.id}</p>
                </div>
                <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300">
                  {report.category}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd className="mt-1 leading-5 text-slate-200">{report.description}</dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                  <dt className="text-slate-500">Incident time</dt>
                  <dd className="text-right text-slate-200">{report.incidentTime}</dd>
                  <dt className="text-slate-500">Location</dt>
                  <dd className="text-right text-slate-200">University Gate 2</dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-slate-700 pt-3 text-xs font-semibold text-amber-300">
                Related to this emerging pattern
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      <CircleMarker
        center={universityGateTwo}
        radius={11}
        pathOptions={{
          color: "#fef3c7",
          fillColor: "#f59e0b",
          fillOpacity: 1,
          weight: 4,
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -12]}>
          University Gate 2
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}