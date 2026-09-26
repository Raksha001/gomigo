"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  Home,
  TrainFront,
  AlertTriangle,
  Zap,
  Ban,
  Tag,
} from "lucide-react";
import { useStore, type VerifyResponse } from "@/lib/store";
import { UNLOCK_FEE, HOST_SHARE, accessInfo } from "@/lib/data";
import {
  readOnchainBin,
  readHasRole,
  ENS_REGISTRY_ADDRESS,
  SEPOLIA_EXPLORER,
  ROLE_SET_RESOLVER,
  ROLE_REGISTRAR,
  HOST_OPERATOR_ADDRESS,
  type OnchainBin,
} from "@/lib/ensv2";
import { truncateHash } from "@/lib/utils";
import DropoffModal from "@/components/DropoffModal";
import { CapacityBar, Pill, SectionTitle, StarRating, StatusBadge, StatTile } from "@/components/ui";

const HOST_ICON = { shop: Store, home: Home, station: TrainFront } as const;

export default function BinDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getBin, applyVerify, addReview } = useStore();
  const bin = getBin(params.id);
  const [err, setErr] = useState<VerifyResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewStars, setReviewStars] = useState(5);
  const [chain, setChain] = useState<OnchainBin | null>(null);
  const [chainLoading, setChainLoading] = useState(true);
  const [roleResolver, setRoleResolver] = useState<boolean | null>(null);
  const [roleRegistrar, setRoleRegistrar] = useState<boolean | null>(null);

  // Read this bin's LIVE registration state from our ENSv2 Sepolia registry.
  useEffect(() => {
    let alive = true;
    const id = params.id;
    if (!id) return;
    setChainLoading(true);
    readOnchainBin(id).then((r) => {
      if (alive) {
        setChain(r);
        setChainLoading(false);
      }
    });
    readHasRole(id, ROLE_SET_RESOLVER, HOST_OPERATOR_ADDRESS).then(
      (v) => alive && setRoleResolver(v),
    );
    readHasRole(id, ROLE_REGISTRAR, HOST_OPERATOR_ADDRESS).then(
      (v) => alive && setRoleRegistrar(v),
    );
    return () => {
      alive = false;
    };
  }, [params.id]);

  if (!bin) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-4xl">🤔</p>
        <p className="font-display text-lg font-extrabold">Bin not found</p>
        <Link href="/disposer" className="font-display font-bold text-pink underline">
          Back to map
        </Link>
      </div>
    );
  }

  const HostIcon = HOST_ICON[bin.hostType];
  const full = bin.status === "FULL";

  function handleResult(res: VerifyResponse) {
    if (res.ok) {
      applyVerify(bin!.id, res);
      router.push("/pass");
    } else {
      setErr(res);
    }
  }

  async function simulate(mode: "success" | "duplicate") {
    setPending(true);
    setErr(null);
    try {
      const r = await fetch("/api/dropoff/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate: mode, bin: bin!.name, ward: bin!.ward }),
      });
      const data = (await r.json()) as Omit<VerifyResponse, "status">;
      handleResult({ ...data, status: r.status });
    } finally {
      setPending(false);
    }
  }

  const acceptedChips = bin.acceptedTypes.split(",").map((s) => s.trim());

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.back()}
        className="press flex w-fit items-center gap-1 rounded-full border-2 border-ink bg-white px-3 py-1.5 font-display text-xs font-extrabold shadow-comic-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero */}
      <div className="rounded-4xl border-4 border-ink bg-white p-5 shadow-comic">
        <div className="flex items-start gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-ink bg-canvas text-5xl">
            {bin.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-display text-xl font-extrabold leading-tight text-ink">
                {bin.label}
              </h1>
              <StatusBadge status={bin.status} />
            </div>
            <p className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted">
              <Tag className="h-3 w-3" /> {bin.name}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-muted">
              <span className="flex items-center gap-1 capitalize">
                <HostIcon className="h-3.5 w-3.5" /> {bin.host}
              </span>
              <span><StarRating value={bin.rating} /> {bin.rating}</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <CapacityBar value={bin.capacity} />
        </div>
      </div>

      {/* ENS records + LIVE on-chain proof */}
      <div className="rounded-4xl border-4 border-ink bg-slate p-4 text-white shadow-comic">
        <div className="flex items-center justify-between">
          <SectionTitle>
            <span className="text-lime">ENSv2 · Sepolia</span>
          </SectionTitle>
          <span className="flex items-center gap-1 rounded-full border-2 border-white/20 px-2 py-0.5 text-[10px] font-bold text-white/70">
            <span
              className={`h-2 w-2 rounded-full ${
                chainLoading ? "bg-white/40" : chain?.registered ? "bg-lime" : "bg-tangerine"
              }`}
            />
            {chainLoading
              ? "reading chain…"
              : chain?.registered
                ? "registered · live"
                : "not on-chain"}
          </span>
        </div>

        {/* Live registration proof */}
        <div className="mt-2 rounded-2xl border-2 border-white/15 bg-white/5 p-3">
          <p className="text-[11px] font-semibold text-white/60">
            Tokenized subname in our own ENSv2 registry
          </p>
          <a
            href={`${SEPOLIA_EXPLORER}/address/${ENS_REGISTRY_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-xs font-bold text-lime underline"
          >
            {bin.id} · registry {ENS_REGISTRY_ADDRESS.slice(0, 8)}…
          </a>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-white/70">
            <span>
              status:{" "}
              <b className={chain?.registered ? "text-lime" : "text-tangerine"}>
                {chainLoading ? "…" : chain?.registered ? "REGISTERED ✓" : "—"}
              </b>
            </span>
            {chain?.expiry ? (
              <span>expires: {new Date(chain.expiry * 1000).toLocaleDateString()}</span>
            ) : null}
          </div>
        </div>

        {/* EAC scoped-role proof (read live) */}
        <div className="mt-2 rounded-2xl border-2 border-white/15 bg-white/5 p-3">
          <p className="text-[11px] font-semibold text-white/60">
            Enhanced Access Control — delegated host rights (live)
          </p>
          <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px]">
            <span className="rounded border border-white/15 px-1.5 py-0.5">
              SET_RESOLVER:{" "}
              <b className={roleResolver ? "text-lime" : "text-white/50"}>
                {roleResolver === null ? "…" : roleResolver ? "granted ✓" : "no"}
              </b>
            </span>
            <span className="rounded border border-white/15 px-1.5 py-0.5">
              REGISTRAR:{" "}
              <b className={roleRegistrar ? "text-tangerine" : "text-lime"}>
                {roleRegistrar === null ? "…" : roleRegistrar ? "granted" : "denied ✓"}
              </b>
            </span>
          </div>
          <p className="mt-1 text-[10px] text-white/50">
            Host holds only the scoped resolver right — not blanket control. That&apos;s EAC.
          </p>
        </div>

        {/* Operational text records (app-managed pending Permissioned Resolver) */}
        <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs">
          <Record k="bin-status" v={bin.status} />
          <Record k="capacity" v={`${bin.capacity}`} />
          <Record k="hours" v={bin.hours} />
          <Record k="accepted-types" v={bin.acceptedTypes} wide />
        </div>
      </div>

      {/* Accepted types + access mode */}
      <div className="flex flex-wrap gap-2">
        <Pill className="bg-sky">
          {accessInfo(bin.accessType).emoji} {accessInfo(bin.accessType).label}
        </Pill>
        {acceptedChips.map((c) => (
          <Pill key={c} className="bg-lime">{c}</Pill>
        ))}
      </div>

      {/* Host economics */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Unlock fee" value={`¥${bin.pricePerDrop}`} color="bg-white" />
        <StatTile label="Host earned" value={`¥${bin.earnings.toLocaleString()}`} sub={`${bin.dropCount} drops`} color="bg-grape text-white" />
        <StatTile label="Quota" value="1/day" sub="per ward" color="bg-white" />
      </div>

      {/* Error state */}
      {err && <RejectionCard result={err} />}

      {/* Verify area */}
      {full ? (
        <div className="rounded-3xl border-4 border-ink bg-tangerine p-4 text-center shadow-comic">
          <p className="font-display text-lg font-extrabold text-ink">This bin is FULL 😵</p>
          <p className="text-xs font-bold text-ink/70">
            A collector gig is open. Pick another bin on the map meanwhile.
          </p>
          <Link href="/disposer" className="mt-2 inline-block font-display font-extrabold text-ink underline">
            ← Back to map
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-3xl border-4 border-ink bg-lime p-4 shadow-comic">
            <p className="font-display text-sm font-extrabold text-ink">
              🔓 Unlock this bin
            </p>
            <p className="text-xs font-bold text-ink/70">
              Prove you&apos;re a real human (Passport / World ID) to get a 10-min gate PIN.
              Host earns ¥{Math.round(bin.pricePerDrop * HOST_SHARE)} of the ¥{UNLOCK_FEE} fee.
            </p>
            <div className="mt-3">
              <DropoffModal
                bin={bin.name}
                ward={bin.ward}
                onResult={handleResult}
                disabled={pending}
              />
            </div>
          </div>

          {/* Judge simulation */}
          <div className="rounded-3xl border-2 border-dashed border-ink/40 bg-white/60 p-3">
            <p className="mb-2 text-center font-display text-[11px] font-extrabold uppercase tracking-wide text-muted">
              ⚡ Judge simulation
            </p>
            <div className="flex flex-col gap-2">
              <button
                disabled={pending}
                onClick={() => simulate("success")}
                className="press flex items-center justify-center gap-2 rounded-xl border-[3px] border-ink bg-lime px-4 py-2.5 font-display text-sm font-extrabold shadow-comic-sm disabled:opacity-50"
              >
                <Zap className="h-4 w-4" /> Simulate World ID Success
              </button>
              <button
                disabled={pending}
                onClick={() => simulate("duplicate")}
                className="press flex items-center justify-center gap-2 rounded-xl border-[3px] border-ink bg-pink px-4 py-2.5 font-display text-sm font-extrabold text-white shadow-comic-sm disabled:opacity-50"
              >
                <Ban className="h-4 w-4" /> Simulate Duplicate (Failure)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Disposer reviews 💬</SectionTitle>
        <div className="flex flex-col gap-2">
          {bin.reviews.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-ink/30 p-4 text-center text-xs font-bold text-muted">
              No reviews yet — be the first!
            </p>
          )}
          {bin.reviews.map((r, i) => (
            <div key={i} className="rounded-2xl border-[3px] border-ink bg-white p-3 shadow-comic-sm">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-extrabold">
                  {r.emoji} {r.author}
                </span>
                <StarRating value={r.rating} />
              </div>
              <p className="mt-0.5 text-xs font-semibold text-muted">{r.text}</p>
            </div>
          ))}
        </div>

        {/* Add review */}
        <div className="rounded-2xl border-[3px] border-ink bg-canvas p-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setReviewStars(s)}
                className={s <= reviewStars ? "text-tangerine" : "text-muted/40"}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="How was this bin? (clean? easy to find?)"
            className="mt-2 h-16 w-full resize-none rounded-xl border-2 border-ink bg-white p-2 text-sm font-semibold outline-none placeholder:text-muted/60"
          />
          <button
            disabled={!reviewText.trim()}
            onClick={() => {
              addReview(bin.id, {
                author: "You",
                emoji: "🧳",
                rating: reviewStars,
                text: reviewText.trim(),
              });
              setReviewText("");
              setReviewStars(5);
            }}
            className="press mt-2 w-full rounded-xl border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm font-extrabold text-white shadow-comic-sm disabled:opacity-40"
          >
            Post review
          </button>
        </div>
      </section>
    </div>
  );
}

function Record({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border-2 border-white/15 bg-white/5 p-2 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] text-white/50">{k}</p>
      <p className="truncate font-bold text-lime">{v}</p>
    </div>
  );
}

function RejectionCard({ result }: { result: VerifyResponse }) {
  const isQuota = result.code === "WARD_QUOTA_EXCEEDED" || result.status === 429;
  return (
    <div className="rounded-3xl border-4 border-ink bg-pink p-4 text-white shadow-comic">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 shrink-0" strokeWidth={2.6} />
        <span className="font-display text-base font-extrabold">
          {isQuota ? "Ward quota hit! 🚫" : "Verification failed"}
        </span>
        <span className="ml-auto rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[10px] font-extrabold text-ink">
          HTTP {result.status}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold leading-snug">{result.error}</p>
      {isQuota && result.nullifierHash && (
        <p className="mt-1 font-mono text-[11px] text-white/80">
          Blocked nullifier: {truncateHash(result.nullifierHash)}
        </p>
      )}
      <p className="mt-1 text-[11px] font-semibold text-white/80">
        {isQuota
          ? "One human = one pass per ward per day. Try a bin in a different ward!"
          : "No PIN issued. You can retry the verification."}
      </p>
    </div>
  );
}
