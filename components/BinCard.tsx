import Link from "next/link";
import { MapPin, Coins } from "lucide-react";
import type { Bin } from "@/lib/data";
import { CapacityBar, StarRating, StatusBadge } from "./ui";

/** A tappable bin summary card used in lists. */
export default function BinCard({
  bin,
  walk,
}: {
  bin: Bin;
  walk?: string;
}) {
  return (
    <Link
      href={`/bin/${bin.id}`}
      className="press block rounded-3xl border-[3px] border-ink bg-white p-4 shadow-comic transition"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink bg-canvas text-3xl">
          {bin.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-extrabold text-ink">
              {bin.label}
            </h3>
            <StatusBadge status={bin.status} />
          </div>
          <p className="truncate font-mono text-[11px] text-muted">{bin.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {walk ?? bin.hours}
            </span>
            <span><StarRating value={bin.rating} /> {bin.rating}</span>
            <span className="flex items-center gap-0.5 text-grape">
              <Coins className="h-3 w-3" /> ¥{bin.earnings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <CapacityBar value={bin.capacity} />
      </div>
    </Link>
  );
}
