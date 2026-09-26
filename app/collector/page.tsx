"use client";

import { useState } from "react";
import { Truck, Coins, MapPin, CheckCircle2, Package, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { REASON_LABEL } from "@/lib/data";
import { getScopedRoles } from "@/lib/ensv2";
import { SectionTitle, StatTile } from "@/components/ui";
import GomiKun from "@/components/GomiKun";

export default function CollectorPage() {
  const { pickups, collectorUsdc, acceptPickup, completePickup, bins } = useStore();
  const [depositing, setDepositing] = useState<string | null>(null); // pickup id being deposited
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const open = pickups.filter((p) => p.status === "open");
  const mine = pickups.filter((p) => p.status === "accepted" && p.collector === "You");
  const done = pickups.filter((p) => p.status === "completed" && p.collector === "You");
  const collectorRole = getScopedRoles("bin")[1]; // COLLECTOR scoped role

  function deposit(pickupId: string, binId: string) {
    setBusy(pickupId);
    completePickup(pickupId, binId);
    const bin = bins.find((b) => b.id === binId);
    const fee = pickups.find((p) => p.id === pickupId)?.feeUsdc ?? 0;
    setMsg(
      `Deposited into ${bin?.name ?? binId} · +${fee} USDC paid (simulated) · host earns too`,
    );
    setDepositing(null);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Collector gigs 🚛</h1>
        <p className="text-xs font-semibold text-muted">
          Pick up trash from travellers, deposit it into a host bin, get paid in crypto.
        </p>
      </div>

      {/* Earnings */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Earned" value={`$${collectorUsdc.toFixed(2)}`} sub="USDC" color="bg-sky text-ink" />
        <StatTile label="Open gigs" value={open.length} color="bg-white" />
        <StatTile label="Completed" value={done.length} color="bg-white" />
      </div>

      {/* ENS role note */}
      <div className="rounded-3xl border-4 border-ink bg-slate p-4 text-white shadow-comic">
        <SectionTitle>
          <span className="text-sky">Your ENSv2 role</span>
        </SectionTitle>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-white/70">
          <span className="font-display font-extrabold text-sky">COLLECTOR</span> —{" "}
          {collectorRole.description}
        </p>
        <p className="mt-1 rounded-lg border border-white/15 bg-white/5 p-2 font-mono text-[11px] text-lime">
          you deposit into a host bin using your scoped EAC role
        </p>
      </div>

      {/* Accepted — needs deposit */}
      {mine.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>
            <Package className="mr-1 inline h-4 w-4" /> Deposit into a bin
          </SectionTitle>
          {mine.map((p) => {
            const options = bins.filter((b) => b.status === "AVAILABLE");
            return (
              <div key={p.id} className="rounded-3xl border-[3px] border-ink bg-lime/50 p-4 shadow-comic-sm">
                <p className="font-display text-sm font-extrabold text-ink">
                  {p.emoji} {p.by} · {p.items}
                </p>
                <p className="text-xs font-bold text-muted capitalize">
                  {p.ward} · {p.where} · +{p.feeUsdc} USDC
                </p>
                {depositing === p.id ? (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <p className="text-[11px] font-bold text-ink">Choose a host bin to deposit into:</p>
                    {options.map((b) => (
                      <button
                        key={b.id}
                        disabled={busy === p.id}
                        onClick={() => deposit(p.id, b.id)}
                        className="press flex items-center justify-between rounded-xl border-2 border-ink bg-white px-3 py-2 text-left font-display text-xs font-extrabold disabled:opacity-50"
                      >
                        <span>{b.emoji} {b.label}</span>
                        <span className="font-mono text-[10px] text-muted">{b.ward}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setDepositing(p.id)}
                    className="press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-ink px-4 py-2.5 font-display text-sm font-extrabold text-white shadow-comic"
                  >
                    {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                    Deposit & get paid
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Open pickup requests */}
      <section className="flex flex-col gap-3">
        <SectionTitle>
          <Truck className="mr-1 inline h-4 w-4" /> Open pickup requests
        </SectionTitle>

        {open.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border-[3px] border-dashed border-ink/40 p-6 text-center">
            <GomiKun mood="happy" size={80} />
            <p className="font-display font-extrabold text-ink">No open pickups right now 🎉</p>
            <p className="text-xs font-semibold text-muted">
              Travellers book pickups from the Map tab. Check back soon.
            </p>
          </div>
        ) : (
          open.map((p) => (
            <div key={p.id} className="rounded-3xl border-[3px] border-ink bg-white p-4 shadow-comic-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink bg-canvas text-2xl">
                  {p.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-extrabold text-ink">
                    {p.by} · {p.items}
                  </h3>
                  <p className="flex items-center gap-2 text-xs font-bold text-muted">
                    <span className="flex items-center gap-0.5 capitalize">
                      <MapPin className="h-3 w-3" /> {p.ward} · {p.where}
                    </span>
                  </p>
                  <span className="mt-1 inline-block rounded-full border-2 border-ink bg-canvas px-2 py-0.5 text-[10px] font-bold">
                    {REASON_LABEL[p.reason]}
                  </span>
                </div>
                <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-sky px-2.5 py-1 font-display text-xs font-extrabold">
                  <Coins className="h-3.5 w-3.5" /> ${p.feeUsdc}
                </span>
              </div>
              <button
                onClick={() => acceptPickup(p.id)}
                className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-lime px-4 py-3 font-display text-sm font-extrabold shadow-comic"
              >
                <Truck className="h-4 w-4" /> Accept pickup
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
      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>Completed 💸</SectionTitle>
          {done.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white p-2.5 text-xs font-bold">
              <span className="truncate capitalize">🚛 {p.by} · {p.ward} → {p.binId}</span>
              <span className="font-mono text-sky">+${p.feeUsdc} USDC</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
