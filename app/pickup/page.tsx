"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Truck, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { REASON_LABEL, type PickupReason } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ChunkyButton, ChunkyLink } from "@/components/Chunky";
import { Field } from "@/components/ui";
import GomiKun from "@/components/GomiKun";

const REASONS: PickupReason[] = ["no-bin", "too-much", "hurry", "sorting"];

export default function PickupPage() {
  const router = useRouter();
  const { bins, requestPickup } = useStore();
  const wards = useMemo(
    () => Array.from(new Set(bins.map((b) => b.ward))),
    [bins],
  );

  const [ward, setWard] = useState(wards[0] ?? "shibuya");
  const [where, setWhere] = useState("");
  const [items, setItems] = useState("");
  const [reason, setReason] = useState<PickupReason>("no-bin");
  const [fee, setFee] = useState(3);
  const [done, setDone] = useState(false);

  const valid = where.trim() && items.trim();

  function book() {
    if (!valid) return;
    requestPickup({ ward, where: where.trim(), items: items.trim(), reason, feeUsdc: fee });
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 py-14 text-center">
        <GomiKun mood="party" size={120} />
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Pickup requested! 🚚</h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            A verified collector will grab it, take your trash, and deposit it in a host bin.
            You&apos;ll pay <b className="text-ink">${fee} USDC</b> on completion.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <ChunkyLink href="/collector" color="sky" size="lg" className="w-full">
            See it on the Collect board →
          </ChunkyLink>
          <ChunkyLink href="/disposer" color="white" size="md" className="w-full">
            ← Back to map
          </ChunkyLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.back()}
        className="press flex w-fit items-center gap-1 rounded-full border-2 border-ink bg-white px-3 py-1.5 font-display text-xs font-extrabold shadow-comic-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Request a pickup 🚚</h1>
        <p className="text-xs font-semibold text-muted">
          No bin nearby? Book a verified collector to take your trash. Paid in crypto (USDC).
        </p>
      </div>

      <Field label="Which ward are you in?">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {wards.map((w) => (
            <button
              key={w}
              onClick={() => setWard(w)}
              className={cn(
                "shrink-0 rounded-full border-2 border-ink px-3 py-1.5 font-display text-xs font-extrabold capitalize transition",
                ward === w ? "bg-ink text-white shadow-comic-sm" : "bg-white",
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Where should the collector meet you?">
        <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Hachikō statue exit" className="input" />
      </Field>

      <Field label="What trash? (they'll sort it for you)">
        <input value={items} onChange={(e) => setItems(e.target.value)} placeholder="e.g. 3 PET bottles, 2 bento boxes" className="input" />
      </Field>

      <Field label="Why a pickup?">
        <div className="grid grid-cols-2 gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                "rounded-2xl border-[3px] border-ink px-2 py-2 font-display text-xs font-extrabold transition",
                reason === r ? "bg-lime shadow-comic-sm" : "bg-white",
              )}
            >
              {reason === r && <Check className="mr-1 inline h-3 w-3" />}
              {REASON_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>

      <Field label={`Offer to the collector: $${fee} USDC`}>
        <input
          type="range"
          min={1}
          max={15}
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          className="w-full accent-sky"
        />
      </Field>

      <ChunkyButton color="sky" size="lg" disabled={!valid} onClick={book} className="w-full">
        <Truck className="h-5 w-5" strokeWidth={2.6} /> Book pickup · ${fee} USDC
      </ChunkyButton>
      <p className="text-center text-[11px] font-semibold text-muted">
        Verified humans only — anti-spam by World ID. Collector paid on deposit into a host bin.
      </p>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 3px solid #212121;
          border-radius: 0.75rem;
          background: #fff;
          padding: 0.6rem 0.75rem;
          font-weight: 700;
          outline: none;
        }
        .input::placeholder { color: #637f9499; }
      `}</style>
    </div>
  );
}
