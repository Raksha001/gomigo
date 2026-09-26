"use client";

import Link from "next/link";
import { Flame, Recycle, Trash2, MapPin, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { levelFromPoints } from "@/lib/data";
import { truncateHash } from "@/lib/utils";
import GomiKun from "@/components/GomiKun";
import { ChunkyLink } from "@/components/Chunky";
import { SectionTitle, StatTile } from "@/components/ui";

export default function ProfilePage() {
  const { profile, history } = useStore();
  const { level, into, toNext, title } = levelFromPoints(profile.points);
  const wards = Array.from(new Set(history.map((h) => h.ward))).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-4xl border-4 border-ink bg-pink p-5 text-white shadow-comic-lg">
        <div className="halftone absolute inset-0 opacity-30" />
        <div className="relative flex items-center gap-4">
          <GomiKun mood="party" size={88} />
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold text-white/80">{profile.emoji} {profile.handle}</p>
            <h1 className="font-display text-2xl font-extrabold leading-tight">{title}</h1>
            <p className="font-display text-sm font-extrabold text-white/90">Level {level}</p>
          </div>
        </div>
        {/* XP bar */}
        <div className="relative mt-4">
          <div className="flex justify-between font-display text-[11px] font-extrabold text-white/90">
            <span>{profile.points} pts</span>
            <span>{toNext} to Lv.{level + 1}</span>
          </div>
          <div className="mt-1 h-4 overflow-hidden rounded-full border-2 border-ink bg-white/30">
            <div className="h-full rounded-full bg-lime" style={{ width: `${into}%` }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Gomi Points" value={profile.points} color="bg-lime" />
        <StatTile label="Day streak" value={<span className="flex items-center gap-1"><Flame className="h-5 w-5 text-tangerine" />{profile.streak}</span>} color="bg-white" />
        <StatTile label="Bottles diverted" value={<span className="flex items-center gap-1"><Recycle className="h-5 w-5 text-sky" />{profile.bottles}</span>} color="bg-white" />
        <StatTile label="Wards visited" value={<span className="flex items-center gap-1"><MapPin className="h-5 w-5 text-pink" />{Math.max(wards.length, 1)}</span>} color="bg-white" />
      </div>

      {/* Impact call-out */}
      <div className="flex items-center gap-3 rounded-3xl border-[3px] border-ink bg-slate p-4 text-white shadow-comic-sm">
        <Sparkles className="h-6 w-6 shrink-0 text-lime" />
        <p className="text-xs font-semibold text-white/80">
          You&apos;ve kept <b className="text-lime">{profile.bottles + profile.combustibles} items</b> off
          Tokyo&apos;s streets — dropped in licensed bins, not alleys. 🌏
        </p>
      </div>

      {/* History */}
      <section className="flex flex-col gap-3">
        <SectionTitle>
          <Trash2 className="mr-1 inline h-4 w-4" /> Drop history
        </SectionTitle>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border-[3px] border-dashed border-ink/40 p-6 text-center">
            <GomiKun mood="hungry" size={80} />
            <p className="font-display font-extrabold text-ink">No drops yet!</p>
            <p className="text-xs font-semibold text-muted">Find a bin and feed Gomi-kun. 🍱</p>
            <ChunkyLink href="/disposer" color="pink" size="md">Find a bin →</ChunkyLink>
          </div>
        ) : (
          history.map((h) => (
            <Link
              key={h.id}
              href={`/bin/${h.binId}`}
              className="press flex items-center justify-between rounded-2xl border-[3px] border-ink bg-white p-3 shadow-comic-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-extrabold text-ink">✅ {h.binLabel}</p>
                <p className="truncate font-mono text-[10px] text-muted">
                  {truncateHash(h.nullifierHash)} · PIN #{h.pin}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-sm font-extrabold text-lime">+{h.points}</p>
                <p className="text-[10px] font-bold text-muted">
                  {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
