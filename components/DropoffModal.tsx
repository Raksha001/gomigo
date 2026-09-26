"use client";

/**
 * components/DropoffModal.tsx — World ID 4.0 verification trigger.
 *
 * The trust moment: unlocking a bin. On tap we fetch a freshly-signed rp_context
 * from the server (the RP private key never reaches the client), then open the
 * IDKitRequestWidget requesting a Passport credential (World ID 4.0, with legacy
 * document fallback). The resulting proof is posted to /api/dropoff/verify, which
 * verifies it at the v4 endpoint and issues the gate PIN.
 */

import { useState } from "react";
import {
  IDKitRequestWidget,
  proofOfHuman,
  setDebug,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerifyResponse } from "@/lib/store";

// Turn on IDKit debug so onError carries a detailed report we can inspect.
if (typeof window !== "undefined") setDebug(true);

interface DropoffModalProps {
  bin: string; // ENS subname (also used as the proof signal)
  ward: string;
  onResult: (res: VerifyResponse) => void;
  disabled?: boolean;
  className?: string;
}

const APP_ID = (process.env.NEXT_PUBLIC_WLD_APP_ID ||
  "app_gomigo") as `app_${string}`;
const ACTION = process.env.NEXT_PUBLIC_WLD_ACTION || "gomigo-dropoff";
// "production" (real World App) | "staging" | "sandbox" (Sandbox World App build).
const ENV = (process.env.NEXT_PUBLIC_WLD_ENV as
  | "production"
  | "staging"
  | "sandbox") || "production";

export default function DropoffModal({
  bin,
  ward,
  onResult,
  disabled,
  className,
}: DropoffModalProps) {
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch a signed rp_context, then open the widget.
  async function start() {
    setLoading(true);
    try {
      const r = await fetch("/api/worldid/context");
      const d = (await r.json()) as { ok: boolean; rpContext?: RpContext };
      if (!d.ok || !d.rpContext) {
        onResult({
          ok: false,
          status: 503,
          code: "NOT_CONFIGURED",
          error:
            "World ID isn't configured on the server. Use the judge-simulation button below.",
        });
        return;
      }
      setRpContext(d.rpContext);
      setOpen(true);
    } catch {
      onResult({
        ok: false,
        status: 503,
        error: "Couldn't reach the World ID context service.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSuccess(result: IDKitResult) {
    const res = await fetch("/api/dropoff/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, bin, ward }),
    });
    const data = (await res.json()) as Omit<VerifyResponse, "status">;
    onResult({ ...data, status: res.status });
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={disabled || loading}
        className={cn(
          "press flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-ink bg-ink px-5 py-4",
          "font-display text-lg font-extrabold text-white shadow-comic-lg",
          "disabled:opacity-40 disabled:shadow-none",
          className,
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing…
          </>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5" strokeWidth={2.6} /> Verify with World ID
          </>
        )}
      </button>

      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={APP_ID}
          action={ACTION}
          environment={ENV}
          rp_context={rpContext}
          allow_legacy_proofs={false}
          preset={proofOfHuman({ signal: bin })}
          onSuccess={handleSuccess}
          onError={(code, report) => {
            // Surface the full debug report to the console for diagnosis.
            // eslint-disable-next-line no-console
            console.error("[IDKit] error:", code, "\nreport:", report);
            const extra = report ? ` — ${JSON.stringify(report).slice(0, 220)}` : "";
            onResult({
              ok: false,
              status: 400,
              code: String(code),
              error:
                code === "user_rejected"
                  ? "Verification cancelled. No gate PIN issued."
                  : `World ID error: ${code}. No gate PIN issued.${extra}`,
            });
          }}
        />
      )}
    </>
  );
}
