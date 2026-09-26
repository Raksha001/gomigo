"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { type AccessType, type Bin } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/Chunky";

const WARDS = ["shibuya", "chiyoda", "shinjuku", "minato", "taito"];
const TYPES = ["🍱 Combustibles", "🥤 PET", "🍾 Glass", "📦 Cardboard", "🥫 Cans"];
const EMOJIS = ["🍶", "🏢", "🚉", "🍜", "🏨", "☕", "🏪", "🍺", "🏠", "🍱"];
const HOST_TYPES = [
  { id: "shop", label: "Shop", emoji: "🏪" },
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "station", label: "Station", emoji: "🚉" },
] as const;
const ACCESS_TYPES = [
  { id: "keypad", label: "Keypad", emoji: "🔒" },
  { id: "staff", label: "Staff", emoji: "🙋" },
  { id: "qr", label: "QR", emoji: "📷" },
  { id: "open", label: "Open", emoji: "🌱" },
] as const;

export default function NewBin() {
  const router = useRouter();
  const { bins, addBin } = useStore();

  const [label, setLabel] = useState("");
  const [host, setHost] = useState("");
  const [ward, setWard] = useState("shibuya");
  const [hostType, setHostType] = useState<(typeof HOST_TYPES)[number]["id"]>("shop");
  const [accessType, setAccessType] = useState<AccessType>("keypad");
  const [hours, setHours] = useState("08:00–22:00");
  const [price, setPrice] = useState(120);
  const [emoji, setEmoji] = useState("🍶");
  const [types, setTypes] = useState<string[]>(["🍱 Combustibles", "🥤 PET"]);
  const [minting, setMinting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [txUrl, setTxUrl] = useState<string | null>(null);

  // Next free label within the chosen ward → bin-0X-<ward>.gomigo.eth (flat,
  // matching how subnames are registered in our ENSv2 registry).
  const proposedLabel = useMemo(() => {
    const inWard = bins.filter((b) => b.ward === ward).length;
    const idx = String(inWard + 1).padStart(2, "0");
    return `bin-${idx}-${ward}`;
  }, [bins, ward]);
  const proposedName = `${proposedLabel}.gomigo.eth`;

  const valid = label.trim() && host.trim() && types.length > 0;

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function mint() {
    if (!valid) return;
    setMinting(true);
    setStatus("Registering subname on ENSv2 Sepolia…");
    // Register the subname on-chain (real tx via /api/ens/register).
    let finalLabel = proposedLabel;
    let onchain = false;
    setTxUrl(null);
    try {
      const res = await fetch("/api/ens/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: proposedLabel, ward }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        label?: string;
        txHash?: string;
        explorer?: string;
        error?: string;
      };
      if (data.ok && data.label) {
        finalLabel = data.label;
        onchain = true;
        if (data.explorer) setTxUrl(data.explorer);
        setStatus(`Registered ${finalLabel}.gomigo.eth on-chain ✓ + delegated host EAC role`);
      } else {
        setStatus(`On-chain registration unavailable — added locally. (${data.error ?? ""})`);
      }
    } catch {
      setStatus("On-chain registration failed — added locally.");
    }

    const bin: Bin = {
      id: finalLabel,
      name: `${finalLabel}.gomigo.eth`,
      label: label.trim(),
      host: host.trim(),
      hostType,
      accessType,
      city: "Tokyo",
      ward,
      emoji,
      status: "AVAILABLE",
      capacity: 0,
      hours,
      acceptedTypes: types.join(", "),
      pricePerDrop: price,
      earnings: 0,
      dropCount: 0,
      lat: 35.66 + (Math.random() - 0.5) * 0.05,
      lng: 139.7 + (Math.random() - 0.5) * 0.05,
      map: { x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 },
      directions: "Padlock PIN entry at the gate. Follow host instructions on arrival.",
      onchain,
      rating: 5,
      reviews: [],
    };
    addBin(bin);
    setMinting(false);
    // On-chain success: stay so the host can see/click the Etherscan tx.
    // Local fallback: go straight to the dashboard.
    if (!onchain) setTimeout(() => router.push("/host"), 300);
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
        <h1 className="font-display text-2xl font-extrabold text-ink">List a bin 🪙</h1>
        <p className="text-xs font-semibold text-muted">
          Mint an ENSv2 subname for your bin and start earning.
        </p>
      </div>

      {/* Live ENS name preview */}
      <div className="rounded-3xl border-4 border-ink bg-slate p-4 text-white shadow-comic">
        <p className="text-[11px] font-bold text-white/60">Your bin&apos;s ENSv2 subname</p>
        <p className="mt-1 break-all font-mono text-lg font-extrabold text-lime">
          {emoji} {proposedName}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-white/60">
          Minted under <span className="font-mono">{ward}.gomigo.eth</span> with a scoped
          HOST_OPERATOR role — you control its records, no one controls yours.
        </p>
      </div>

      {/* Form */}
      <Field label="Bin / place name">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Cafe Mon Izakaya"
          className="input"
        />
      </Field>

      <Field label="Host name (you)">
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="e.g. Cafe Mon"
          className="input"
        />
      </Field>

      <Field label="Host type">
        <div className="grid grid-cols-3 gap-2">
          {HOST_TYPES.map((h) => (
            <button
              key={h.id}
              onClick={() => setHostType(h.id)}
              className={cn(
                "rounded-2xl border-[3px] border-ink py-2 font-display text-sm font-extrabold transition",
                hostType === h.id ? "bg-grape text-white shadow-comic-sm" : "bg-white",
              )}
            >
              {h.emoji} {h.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Access type (how disposers get in)">
        <div className="grid grid-cols-4 gap-2">
          {ACCESS_TYPES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccessType(a.id)}
              className={cn(
                "rounded-2xl border-[3px] border-ink py-2 font-display text-xs font-extrabold transition",
                accessType === a.id ? "bg-lime shadow-comic-sm" : "bg-white",
              )}
            >
              {a.emoji}
              <br />
              {a.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Ward">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {WARDS.map((w) => (
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

      <Field label="Icon">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink text-2xl transition",
                emoji === e ? "bg-lime shadow-comic-sm" : "bg-white",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours">
          <input value={hours} onChange={(e) => setHours(e.target.value)} className="input" />
        </Field>
        <Field label="Unlock fee (¥)">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Accepted types">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                "rounded-full border-2 border-ink px-3 py-1.5 font-display text-xs font-bold transition",
                types.includes(t) ? "bg-lime shadow-comic-sm" : "bg-white text-muted",
              )}
            >
              {types.includes(t) && <Check className="mr-1 inline h-3 w-3" />}
              {t}
            </button>
          ))}
        </div>
      </Field>

      <ChunkyButton color="grape" size="lg" disabled={!valid || minting} onClick={mint} className="w-full">
        {minting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Minting subname…
          </>
        ) : (
          <>🪄 Mint & list bin</>
        )}
      </ChunkyButton>

      {status && (
        <div className="rounded-2xl border-2 border-ink bg-lime/40 p-2.5 text-center font-display text-xs font-bold text-ink">
          <p>{status}</p>
          {txUrl && (
            <a
              href={txUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block underline"
            >
              🔗 View transaction on Etherscan
            </a>
          )}
          {txUrl && (
            <Link href="/host" className="mt-1 block underline text-grape">
              → Go to Host dashboard
            </Link>
          )}
        </div>
      )}

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
        .input::placeholder {
          color: #637f9499;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-xs font-extrabold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
