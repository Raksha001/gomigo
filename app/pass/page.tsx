"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ShieldCheck, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { accessInfo } from "@/lib/data";
import GomiKun from "@/components/GomiKun";
import ConfettiBurst from "@/components/ConfettiBurst";
import { ChunkyLink } from "@/components/Chunky";
import { truncateHash } from "@/lib/utils";

const TTL = 10 * 60 * 1000;

export default function PassPage() {
  const { activePass, clearPass } = useStore();
  const [remaining, setRemaining] = useState(0);
  const [fireConfetti, setFireConfetti] = useState(false);

  useEffect(() => {
    if (!activePass) return;
    setFireConfetti(true);
    const tick = () => setRemaining(Math.max(0, activePass.expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [activePass]);

  if (!activePass) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <GomiKun mood="sleepy" size={120} />
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">No active pass 💤</h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            Verify at a bin to get a 10-minute gate PIN.
          </p>
        </div>
        <ChunkyLink href="/disposer" color="pink" size="lg">
          Find a bin →
        </ChunkyLink>
      </div>
    );
  }

  const expired = remaining === 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const pct = Math.max(0, Math.min(1, remaining / TTL));
  const ring = 2 * Math.PI * 52;
  const access = accessInfo(activePass.accessType);

  return (
    <div className="flex flex-col gap-4">
      <ConfettiBurst fire={fireConfetti} />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink">Your pass 🎟️</h1>
        <button
          onClick={clearPass}
          className="press flex items-center gap-1 rounded-full border-2 border-ink bg-white px-3 py-1.5 font-display text-xs font-extrabold shadow-comic-sm"
        >
          <X className="h-4 w-4" /> Done
        </button>
      </div>

      {/* Pass card */}
      <div className={`relative overflow-hidden rounded-4xl border-4 border-ink p-5 shadow-comic-lg ${expired ? "bg-canvas" : "bg-lime"}`}>
        <div className="halftone absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-display text-xs font-extrabold uppercase tracking-wide text-ink">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.6} /> Verified human
            </span>
            {activePass.simulated && (
              <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[10px] font-extrabold">
                SIM
              </span>
            )}
          </div>

          {/* Countdown ring + PIN */}
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#21212122" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#212121"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ring}
                  strokeDashoffset={ring * (1 - pct)}
                  style={{ transition: "stroke-dashoffset 0.25s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className="h-4 w-4 text-ink" />
                <span className="font-mono text-xl font-extrabold text-ink">
                  {mm}:{ss}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[11px] font-extrabold uppercase tracking-widest text-ink/60">
                {activePass.accessType === "keypad" ? "Gate PIN" : "Pass code"}
              </p>
              <p className="font-mono text-5xl font-extrabold leading-none tracking-[0.1em] text-ink">
                {expired ? "----" : `#${activePass.pin}`}
              </p>
              <p className="mt-1 truncate font-display text-sm font-extrabold text-ink">
                {activePass.binLabel}
              </p>
            </div>
          </div>

          {expired ? (
            <div className="mt-4 rounded-2xl border-2 border-ink bg-white p-3 text-center">
              <p className="font-display font-extrabold text-ink">Pass expired ⏰</p>
              <p className="text-xs font-bold text-muted">Verify again to get a fresh PIN.</p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border-2 border-ink bg-ink p-3 text-white">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 font-display text-xs font-extrabold text-lime">
                  {access.emoji} {access.headline}
                </p>
                <span className="rounded-full border border-white/25 px-2 py-0.5 text-[9px] font-bold text-white/70">
                  {access.label}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-snug">{access.howTo}</p>
              <p className="mt-2 text-[11px] font-bold text-white/60">
                Accepts: {activePass.acceptedTypes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mascot cheer */}
      <div className="flex items-center gap-3 rounded-3xl border-[3px] border-ink bg-white p-3 shadow-comic-sm">
        <GomiKun mood={expired ? "sad" : "party"} size={64} animate={!expired} />
        <div>
          <p className="font-display text-sm font-extrabold text-ink">
            {expired ? "Aww, it timed out!" : "+10 Gomi Points! 🎉"}
          </p>
          <p className="text-xs font-semibold text-muted">
            {expired
              ? "No worries — grab a fresh pass anytime."
              : "Nice one. Your streak just grew."}
          </p>
        </div>
      </div>

      <p className="text-center font-mono text-[11px] text-muted">
        proof nullifier: {truncateHash(activePass.nullifierHash)}
      </p>

      <div className="flex gap-2">
        <ChunkyLink href="/disposer" color="white" size="md" className="flex-1">
          ← Map
        </ChunkyLink>
        <ChunkyLink href="/profile" color="pink" size="md" className="flex-1">
          My stats →
        </ChunkyLink>
      </div>
    </div>
  );
}
