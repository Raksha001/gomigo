/**
 * GET /api/worldid/context
 *
 * Returns a freshly-signed World ID 4.0 rp_context for the client widget. The RP
 * private key never leaves the server — only the signed nonce/timestamps do.
 */

import { NextResponse } from "next/server";
import { ACTION, APP_ID, buildRpContext } from "@/lib/worldid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rpContext = buildRpContext();
  if (!rpContext) {
    return NextResponse.json({ ok: false, configured: false }, { status: 200 });
  }
  return NextResponse.json({
    ok: true,
    configured: true,
    app_id: APP_ID,
    action: ACTION,
    rpContext,
  });
}
