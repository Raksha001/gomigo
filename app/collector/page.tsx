"use client";

import { useState } from "react";
import { Truck, Coins, MapPin, CheckCircle2, Loader2, Route } from "lucide-react";
import { useStore } from "@/lib/store";
import { COLLECTOR_PAYOUT } from "@/lib/data";
import { getScopedRoles, setBinStatus } from "@/lib/ensv2";
import { SectionTitle, StatTile } from "@/components/ui";
import GomiKun from "@/components/GomiKun";

export default function CollectorPage() {
  const { bins, collectBin, collectorEarnings, collectorJobs } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fullBins = bins.filter((b) => b.status === "FULL");
  const collectorRole = getScopedRoles("bin")[1]; // COLLECTOR

  async function accept(id: string, name: string) {
    setBusy(id);
    setMsg(null);
    // Constrained ENS write: collector may only reset bin-status → AVAILABLE.
    const res = await setBinStatus(name, "AVAILABLE");
    collectBin(id);
    setMsg(`${res.message} · +¥${COLLECTOR_PAYOUT} earned`);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Collector gigs 🚛</h1>
        <p className="text-xs font-semibold text-muted">
          Empty full bins around Tokyo. Get paid per pickup.
        </p>
      </div>

      {/* Earnings */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Earned" value={`¥${collectorEarnings.toLocaleString()}`} color="bg-sky text-ink" />
        <StatTile label="Per gig" value={`¥${COLLECTOR_PAYOUT}`} color="bg-white" />
        <StatTile label="Open gigs" value={fullBins.length} color="bg-white" />
      </div>

      {/* Constrained role note */}
      <div className="rounded-3xl border-4 border-ink bg-slate p-4 text-white shadow-comic">
        <SectionTitle>
          <span className="text-sky">Your ENSv2 role</span>
        </SectionTitle>
        <p className="mt-1 text-[11px] font-semibold text-white/70">
          <span className="font-display font-extrabold text-sky">COLLECTOR</span> —{" "}
          {collectorRole.description}
        </p>
        <p className="mt-1 rounded-lg border border-white/15 bg-white/5 p-2 font-mono text-[11px] text-lime">
          scope: bin-status → AVAILABLE only
        </p>
      </div>

      {/* Open gigs */}
      <section className="flex flex-col gap-3">
        <SectionTitle>
          <Route className="mr-1 inline h-4 w-4" /> Open pickups
        </SectionTitle>

        {fullBins.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border-[3px] border-dashed border-ink/40 p-6 text-center">
            <GomiKun mood="happy" size={80} />
            <p className="font-display font-extrabold text-ink">All bins are empty! 🎉</p>
            <p className="text-xs font-semibold text-muted">
              No gigs right now. Check back when bins fill up.
            </p>
          </div>
        ) : (
          fullBins.map((b) => (
            <div key={b.id} className="rounded-3xl border-[3px] border-ink bg-white p-4 shadow-comic-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink bg-tangerine text-2xl">
                  {b.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-extrabold text-ink">{b.label}</h3>
                  <p className="truncate font-mono text-[10px] text-muted">{b.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs font-bold text-muted">
                    <span className="flex items-center gap-0.5 capitalize">
                      <MapPin className="h-3 w-3" /> {b.ward}
                    </span>
                    <span className="text-tangerine">{b.capacity}% full</span>
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-sky px-2.5 py-1 font-display text-xs font-extrabold">
                  <Coins className="h-3.5 w-3.5" /> ¥{COLLECTOR_PAYOUT}
                </span>
              </div>
              <button
                disabled={busy === b.id}
                onClick={() => accept(b.id, b.name)}
                className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-ink px-4 py-3 font-display text-sm font-extrabold text-white shadow-comic disabled:opacity-50"
              >
                {busy === b.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Emptying & writing ENS…
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4" /> Accept & mark emptied
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </section>

      {msg && (
        <div className="flex items-start gap-2 rounded-2xl border-[3px] border-ink bg-sky p-3 text-xs font-bold text-ink shadow-comic-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Completed */}
      {collectorJobs.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>Completed today ✅</SectionTitle>
          {collectorJobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white p-2.5 text-xs font-bold">
              <span className="truncate capitalize">🚛 {j.binLabel} · {j.ward}</span>
              <span className="font-mono text-sky">+¥{j.payout}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
