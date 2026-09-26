"use client";

import { useState } from "react";
import { Coins, Plus, Trophy, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { getScopedRoles, setBinStatus, type BinStatus } from "@/lib/ensv2";
import { ChunkyLink } from "@/components/Chunky";
import { CapacityBar, SectionTitle, StatTile } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function HostDashboard() {
  const { bins, toggleStatus, history } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const totalEarnings = bins.reduce((s, b) => s + b.earnings, 0);
  const totalDrops = bins.reduce((s, b) => s + b.dropCount, 0);
  const roles = getScopedRoles(bins[0]?.name ?? "bin-01.shibuya.gomigo.eth");

  async function onToggle(id: string, name: string, current: BinStatus) {
    const next: BinStatus = current === "AVAILABLE" ? "FULL" : "AVAILABLE";
    setBusy(id);
    toggleStatus(id, next); // optimistic
    const res = await setBinStatus(name, next); // ENS text-record write (or sim)
    setMsg(res.message);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Host console 🏠</h1>
        <p className="text-xs font-semibold text-muted">
          Rent out your locked bin. Earn every time a verified human drops trash.
        </p>
      </div>

      {/* Earnings */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Total earned" value={`¥${totalEarnings.toLocaleString()}`} color="bg-grape text-white" />
        <StatTile label="Drops served" value={totalDrops} color="bg-white" />
        <StatTile label="Your bins" value={bins.length} color="bg-white" />
      </div>

      <ChunkyLink href="/host/new" color="grape" size="lg" className="w-full">
        <Plus className="h-5 w-5" strokeWidth={3} /> List a new bin
      </ChunkyLink>

      {/* EAC roles */}
      <div className="rounded-4xl border-4 border-ink bg-slate p-4 text-white shadow-comic">
        <SectionTitle>
          <span className="text-lime">EAC scoped roles</span>
        </SectionTitle>
        <p className="mt-1 text-[11px] font-semibold text-white/60">
          ENSv2 Enhanced Access Control — role-based write permissions per bin.
        </p>
        <div className="mt-3 space-y-2">
          {roles.map((r) => (
            <div key={r.role} className="rounded-2xl border-2 border-white/15 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs font-extrabold text-lime">{r.role}</span>
                <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold text-white/70">
                  {r.canWrite.length ? `write: ${r.constraint ?? r.canWrite.join(", ")}` : "read-only"}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-snug text-white/60">
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bins */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Your bins 🗑️</SectionTitle>
        {bins.map((b) => (
          <div key={b.id} className="rounded-3xl border-[3px] border-ink bg-white p-4 shadow-comic-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink bg-canvas text-2xl">
                {b.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-sm font-extrabold text-ink">{b.label}</h3>
                <p className="truncate font-mono text-[10px] text-muted">{b.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-grape">
                  <Coins className="h-3 w-3" /> ¥{b.earnings.toLocaleString()} · {b.dropCount} drops
                </p>
              </div>
              {/* Status toggle */}
              <button
                disabled={busy === b.id}
                onClick={() => onToggle(b.id, b.name, b.status)}
                className={cn(
                  "relative h-9 w-20 shrink-0 rounded-full border-[3px] border-ink transition disabled:opacity-50",
                  b.status === "AVAILABLE" ? "bg-lime" : "bg-tangerine",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-white text-[9px] font-extrabold transition-all",
                    b.status === "AVAILABLE" ? "left-[46px]" : "left-0.5",
                  )}
                >
                  {b.status === "AVAILABLE" ? "OK" : "X"}
                </span>
                <span
                  className={cn(
                    "absolute inset-0 flex items-center font-display text-[9px] font-extrabold text-ink",
                    b.status === "AVAILABLE" ? "justify-start pl-2" : "justify-end pr-2.5",
                  )}
                >
                  {b.status === "AVAILABLE" ? "OPEN" : "FULL"}
                </span>
              </button>
            </div>
            <div className="mt-3">
              <CapacityBar value={b.capacity} />
            </div>
          </div>
        ))}
      </section>

      {msg && (
        <div className="flex items-start gap-2 rounded-2xl border-[3px] border-ink bg-lime p-3 text-xs font-bold text-ink shadow-comic-sm">
          <Info className="h-4 w-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Recent activity */}
      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>
            <Trophy className="mr-1 inline h-4 w-4" /> Recent drops
          </SectionTitle>
          {history.slice(0, 5).map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white p-2.5 text-xs font-bold">
              <span className="truncate">✅ {h.binLabel}</span>
              <span className="font-mono text-muted">
                {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
