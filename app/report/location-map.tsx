"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type Coordinate = [number, number];

const indiaCenter: Coordinate = [20.5937, 78.9629];

function MapViewport({ center, zoom }: { center: Coordinate; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
}

function MapClickHandler({
  interactive,
  onSelect,
}: {
  interactive: boolean;
  onSelect: (point: Coordinate) => void;
}) {
  useMapEvents({
    click(event) {
      if (interactive) {
        onSelect([event.latlng.lat, event.latlng.lng]);
      }
    },
  });

  return null;
}

export default function LocationMap({
  center = indiaCenter,
  zoom = 5,
  selectedPoint,
  onSelect,
  interactive = true,
}: {
  center?: Coordinate;
  zoom?: number;
  selectedPoint: Coordinate | null;
  onSelect: (point: Coordinate) => void;
  interactive?: boolean;
}) {
  function handleMarkerDragEnd(event: { target: { getLatLng: () => { lat: number; lng: number } } }) {
    const point = event.target.getLatLng();
    onSelect([point.lat, point.lng]);
  }

  return (
    <div className="h-full min-h-80 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full min-h-80 w-full"
      >
        <MapViewport center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler interactive={interactive} onSelect={onSelect} />
        {selectedPoint && (
          <Marker
            position={selectedPoint}
            draggable={interactive}
            eventHandlers={interactive ? { dragend: handleMarkerDragEnd } : undefined}
          />
        )}
      </MapContainer>
    </div>
  );
}
