/**
 * lib/worldid.ts — server-side World ID 4.0 helpers.
 *
 * World ID 4.0 verifies against a registered Relying Party (RP), not a bare
 * app_id. Every verification request must carry an `rp_context`: a nonce +
 * timestamps signed by the RP's ECDSA signer key. We build that signature here
 * with `@worldcoin/idkit-server` (`signRequest`) using the RP private key, which
 * lives ONLY on the server (never NEXT_PUBLIC). The signed context is handed to
 * the client widget; the resulting proof is verified at the v4 verify endpoint.
 */

import { signRequest } from "@worldcoin/idkit-server";

export const APP_ID = (process.env.NEXT_PUBLIC_WLD_APP_ID || "") as `app_${string}`;
export const ACTION = process.env.NEXT_PUBLIC_WLD_ACTION || "gomigo-dropoff";
export const RP_ID =
  process.env.WLD_RP_ID || process.env.NEXT_PUBLIC_WLD_RP_ID || "";

const RP_PRIVATE_KEY = process.env.WLD_RP_PRIVATE_KEY;
/** Staging/sandbox verification token (24h window). Sent as a header so the v4
 *  endpoint accepts sandbox proofs; harmless/ignored for production proofs. */
export const STAGING_TOKEN = process.env.WLD_STAGING_TOKEN;

export const V4_VERIFY_URL = `https://developer.world.org/api/v4/verify/${RP_ID}`;

export interface RpContext {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
}

/** True when the server has everything needed to run real verifications. */
export function isWorldIdConfigured(): boolean {
  return Boolean(RP_PRIVATE_KEY && RP_ID);
}

/**
 * Build a fresh, signed rp_context for a verification request. Returns null if
 * the server isn't configured (so the UI can fall back to the judge simulator).
 */
export function buildRpContext(action: string = ACTION): RpContext | null {
  if (!RP_PRIVATE_KEY || !RP_ID) return null;
  // Generous 1h TTL so the QR never expires mid-scan during a demo.
  const s = signRequest({ signingKeyHex: RP_PRIVATE_KEY, action, ttl: 3600 });
  return {
    rp_id: RP_ID,
    nonce: s.nonce,
    created_at: s.createdAt,
    expires_at: s.expiresAt,
    signature: s.sig,
  };
}

/** Minimal shape of a World ID 4.0 proof result (from IDKitRequestWidget). */
export interface IDKitV4Result {
  protocol_version?: string;
  nonce?: string;
  action?: string;
  responses?: Array<{
    identifier: string;
    signal_hash?: string;
    proof: string[];
    nullifier: string;
    [k: string]: unknown;
  }>;
  [k: string]: unknown;
}

/**
 * Verify a World ID 4.0 proof result against the v4 verify endpoint.
 *
 * Tries a production verification first (no staging header). If that fails and we
 * hold a staging token, retries as a sandbox/staging proof. This makes both a
 * real World App proof and a Sandbox proof work without any client-side flag.
 */
export async function verifyV4Proof(
  result: IDKitV4Result,
): Promise<{ ok: boolean; nullifier?: string; error?: string; status?: number }> {
  const nullifier = result.responses?.[0]?.nullifier;
  if (!nullifier) {
    return { ok: false, error: "Proof missing a nullifier.", status: 400 };
  }

  async function attempt(withStaging: boolean) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (withStaging && STAGING_TOKEN) headers["x-staging-verification-token"] = STAGING_TOKEN;
    const res = await fetch(V4_VERIFY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(result),
    });
    if (res.ok) return { ok: true as const };
    const detail = (await res.json().catch(() => ({}))) as {
      code?: string;
      detail?: string;
    };
    return {
      ok: false as const,
      status: res.status,
      error: detail.detail || "World ID proof rejected.",
    };
  }

  try {
    // 1) Production attempt.
    const prod = await attempt(false);
    if (prod.ok) return { ok: true, nullifier };

    // 2) Sandbox/staging fallback (only if we have a token).
    if (STAGING_TOKEN) {
      const staged = await attempt(true);
      if (staged.ok) return { ok: true, nullifier };
      return { ok: false, status: staged.status, error: staged.error };
    }
    return { ok: false, status: prod.status, error: prod.error };
  } catch {
    return { ok: false, status: 502, error: "Could not reach World ID verify service." };
  }
}
