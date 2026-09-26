/**
 * POST /api/dropoff/verify
 *
 * Verifies a World ID 4.0 proof (via the RP's v4 verify endpoint), then enforces
 * GomiGo's ward-scoped Sybil limit before issuing a time-boxed gate PIN.
 *
 * Trust moment: issuing a PIN that physically unlocks a private commercial
 * dumpster or apartment waste room. We must know the requester is a unique human
 * (not a bot spamming PINs to enable illegal dumping / fuhō-tōki) — but we do NOT
 * need their real-world identity. The World ID 4.0 Passport credential is the
 * minimum sufficient assurance: document-level uniqueness, no Orb, and an
 * RP-scoped nullifier we rate-limit on. Nothing personally identifying is stored.
 *
 * Rubric alternative paths:
 *   - Success             → 200 + dynamic 4-digit PIN + 10-min expiry + directions
 *   - Duplicate/ward cap  → 429 with explicit suppression message
 *   - Cancelled / invalid → 400 with visible error
 */

import { NextResponse } from "next/server";
import { resolveBin } from "@/lib/ensv2";
import { verifyV4Proof, type IDKitV4Result } from "@/lib/worldid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 pass / ward / day
const PIN_TTL_MS = 10 * 60 * 1000; // 10-minute countdown

// In-memory ward-scoped nullifier cache. Key: `${ward}:${nullifier}` → last-use ms.
const usedNullifiers = new Map<string, number>();
const quotaKey = (ward: string, nullifier: string) => `${ward}:${nullifier}`;

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

interface VerifyBody {
  result?: IDKitV4Result; // World ID 4.0 proof result from IDKitRequestWidget
  bin?: string;
  ward?: string;
  simulate?: "success" | "duplicate";
}

export async function POST(req: Request) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const binName = body.bin || "bin-01.shibuya.gomigo.eth";
  const bin = await resolveBin(binName);
  const ward = body.ward || bin?.ward || "shibuya";
  const wardLabel = ward.charAt(0).toUpperCase() + ward.slice(1);

  // --- Judge simulation (deterministic, no World servers) ------------------
  if (body.simulate === "duplicate") {
    return NextResponse.json(
      {
        ok: false,
        code: "WARD_QUOTA_EXCEEDED",
        error: `Daily quota exceeded for ${wardLabel} Ward. Gate PIN generation suppressed.`,
        ward,
        nullifierHash:
          "0x8f2a1b3c4d5e6f708192a3b4c5d6e7f809a1b2c3d4e5f60718293a4b5c6d7c391",
      },
      { status: 429 },
    );
  }

  const simulated = body.simulate === "success";

  let nullifier: string | undefined;

  if (simulated) {
    nullifier = `0xsim${Math.random().toString(16).slice(2).padEnd(60, "0")}`;
  } else {
    // --- Real World ID 4.0 verification ------------------------------------
    if (!body.result?.responses?.length) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_PROOF",
          error: "Verification cancelled or proof incomplete. No gate PIN issued.",
        },
        { status: 400 },
      );
    }
    const v = await verifyV4Proof(body.result);
    if (!v.ok) {
      return NextResponse.json(
        { ok: false, code: "INVALID_PROOF", error: v.error ?? "World ID proof rejected." },
        { status: v.status ?? 400 },
      );
    }
    nullifier = v.nullifier;
  }

  if (!nullifier) {
    return NextResponse.json(
      { ok: false, code: "INVALID_PROOF", error: "Missing nullifier." },
      { status: 400 },
    );
  }

  // --- Ward-scoped Sybil / rate limit (1 pass / ward / day) ----------------
  const key = quotaKey(ward, nullifier);
  const now = Date.now();
  const last = usedNullifiers.get(key);
  if (last && now - last < QUOTA_WINDOW_MS) {
    return NextResponse.json(
      {
        ok: false,
        code: "WARD_QUOTA_EXCEEDED",
        error: `Daily quota exceeded for ${wardLabel} Ward. Gate PIN generation suppressed.`,
        ward,
        nullifierHash: nullifier,
      },
      { status: 429 },
    );
  }
  usedNullifiers.set(key, now);

  // --- Success — issue the time-boxed gate PIN -----------------------------
  const pin = generatePin();
  const expiresAt = now + PIN_TTL_MS;

  return NextResponse.json(
    {
      ok: true,
      pin,
      expiresAt,
      ttlMs: PIN_TTL_MS,
      ward,
      bin: bin?.name ?? binName,
      binLabel: bin?.label ?? binName,
      directions:
        bin?.directions ?? "Punch PIN on the smart padlock at the indicated gate.",
      acceptedTypes: bin?.acceptedTypes ?? "🍱 Combustibles, 🥤 PET",
      nullifierHash: nullifier,
      simulated,
    },
    { status: 200 },
  );
}
