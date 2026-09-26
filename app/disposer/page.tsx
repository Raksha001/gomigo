"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, Navigation } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEFAULT_LOCATION, distanceMeters, walkLabel } from "@/lib/data";
import { cn } from "@/lib/utils";
import BinCard from "@/components/BinCard";
import { SectionTitle } from "@/components/ui";

// Leaflet touches window/document, so load the map client-only (no SSR).
const BinMap = dynamic(() => import("@/components/BinMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate font-display text-sm font-extrabold text-white/70">
      Loading map…
    </div>
  ),
});

export default function DisposerPage() {
  const { bins, location, setLocation } = useStore();
  const [ward, setWard] = useState<string>("all");
  const [geoState, setGeoState] = useState<"idle" | "asking" | "on" | "denied">(
    location ? "on" : "idle",
  );

  const askLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocation(DEFAULT_LOCATION);
      setGeoState("denied");
      return;
    }
    setGeoState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("on");
      },
      () => {
        setLocation(DEFAULT_LOCATION);
        setGeoState("denied");
      },
      { timeout: 6000 },
    );
  };

  // Auto-ask once on mount.
  useEffect(() => {
    if (!location) askLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loc = location ?? DEFAULT_LOCATION;

  const wards = useMemo(
    () => ["all", ...Array.from(new Set(bins.map((b) => b.ward)))],
    [bins],
  );

  const sorted = useMemo(() => {
    return bins
      .map((b) => ({ b, d: distanceMeters(loc, { lat: b.lat, lng: b.lng }) }))
      .filter(({ b }) => ward === "all" || b.ward === ward)
      .sort((a, z) => a.d - z.d);
  }, [bins, loc, ward]);

  const openCount = bins.filter((b) => b.status === "AVAILABLE").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Find a bin 🔎</h1>
          <p className="text-xs font-semibold text-muted">
            {openCount} bins open near you right now
          </p>
        </div>
        <button
          onClick={askLocation}
          className="press flex items-center gap-1 rounded-2xl border-[3px] border-ink bg-lime px-3 py-2 font-display text-xs font-extrabold shadow-comic-sm"
        >
          <LocateFixed className="h-4 w-4" strokeWidth={2.6} />
          {geoState === "asking" ? "Locating…" : "Locate me"}
        </button>
      </div>

      {/* Real interactive map */}
      <div className="relative h-64 overflow-hidden rounded-4xl border-4 border-ink bg-slate shadow-comic">
        <BinMap bins={ward === "all" ? bins : bins.filter((b) => b.ward === ward)} me={loc} />
        <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full border-2 border-ink bg-lime px-2.5 py-1 font-display text-[11px] font-extrabold">
          Tokyo bin network
        </div>
        <div className="pointer-events-none absolute bottom-2 right-3 z-[500] text-[8px] font-semibold text-ink/40">
          © Mapbox © OpenStreetMap
        </div>
      </div>

      {/* Legend */}
      <div className="-mt-1 flex items-center gap-3 text-[11px] font-bold text-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-ink bg-lime" /> Open</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-ink bg-tangerine" /> Full</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-ink bg-sky" /> You</span>
        <span className="ml-auto">Tap a pin to open</span>
      </div>

      {/* Ward filter */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {wards.map((w) => (
          <button
            key={w}
            onClick={() => setWard(w)}
            className={cn(
              "shrink-0 rounded-full border-2 border-ink px-3 py-1.5 font-display text-xs font-extrabold capitalize transition",
              ward === w ? "bg-ink text-white shadow-comic-sm" : "bg-white text-ink",
            )}
          >
            {w === "all" ? "All wards" : w}
          </button>
        ))}
      </div>

      {/* Nearby list */}
      <section className="flex flex-col gap-3">
        <SectionTitle>
          <Navigation className="mr-1 inline h-4 w-4" /> Nearest to you
        </SectionTitle>
        {sorted.map(({ b, d }) => (
          <BinCard key={b.id} bin={b} walk={walkLabel(d)} />
        ))}
      </section>
    </div>
  );
}
