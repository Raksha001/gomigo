"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Bin } from "@/lib/data";

/** Emoji bin marker as a Leaflet divIcon (avoids the default-icon asset issue). */
function binIcon(bin: Bin) {
  const bg = bin.status === "AVAILABLE" ? "#E4F843" : "#FF8A3D";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:38px;height:38px;border:3px solid #212121;border-radius:50%;
      background:${bg};display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:2px 2px 0 0 #212121;transform:translate(-1px,-1px);
    ">${bin.emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

const meIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border:3px solid #fff;border-radius:50%;
    background:#4CC9F0;box-shadow:0 0 0 3px #21212155;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/** Fit the viewport to all markers whenever the inputs change. */
function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function BinMap({
  bins,
  me,
}: {
  bins: Bin[];
  me: { lat: number; lng: number };
}) {
  const router = useRouter();
  const points = [...bins.map((b) => ({ lat: b.lat, lng: b.lng })), me];

  // Mapbox tiles when a public token is set; clean CARTO fallback otherwise.
  const mapbox = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const tileUrl = mapbox
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapbox}`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer
      center={[me.lat, me.lng]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <TileLayer url={tileUrl} subdomains={["a", "b", "c", "d"]} />
      <FitBounds points={points} />
      <Marker position={[me.lat, me.lng]} icon={meIcon} />
      {bins.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={binIcon(b)}
          eventHandlers={{ click: () => router.push(`/bin/${b.id}`) }}
        />
      ))}
    </MapContainer>
  );
}
