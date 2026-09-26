/**
 * POST /api/ens/register
 *
 * Registers a NEW bin as a tokenized subname in our ENSv2 registry on Sepolia,
 * live. The registry's ROLE_REGISTRAR is held by the deployer key (server-only),
 * so registration is signed here rather than in the browser. Returns the real
 * transaction hash + the resolvable `<label>.gomigo.eth` name.
 *
 * Body: { label: string, ward?: string }
 * → 200 { ok, label, name, txHash, anyId }  |  4xx/5xx { ok:false, error }
 */

import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { getAddress } from "viem";
import { ENS_REGISTRY_ADDRESS, HOST_OPERATOR_ADDRESS } from "@/lib/ensv2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// publicnode is the most reliable for writes; 1rpc rate-limits, so it's last.
const RPCS = [
  "https://ethereum-sepolia.publicnode.com",
  "https://sepolia.drpc.org",
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://1rpc.io/sepolia",
];
const RESOLVER = "0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f"; // PublicResolverV2
const ZERO = "0x0000000000000000000000000000000000000000";

const bit = (n: number) => 1n << BigInt(n);
const REGULAR = bit(0) | bit(12) | bit(16) | bit(20) | bit(24);
const OWNER_ROLES = REGULAR | (REGULAR << 128n);
const ROLE_SET_RESOLVER = bit(24); // the single right we delegate to the host

const ABI = parseAbi([
  "function register(string label, address owner, address subregistry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getState(uint256 anyId) view returns (uint8 status, uint64 expiry, uint256 tokenId)",
  "function grantRoles(uint256 anyId, uint256 roleBitmap, address account) returns (bool)",
]);

/** Normalise a label to DNS-safe lowercase (letters, digits, dashes). */
function sanitize(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function POST(req: Request) {
  const pk = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    return NextResponse.json(
      { ok: false, error: "On-chain registration not configured (no deployer key)." },
      { status: 503 },
    );
  }

  let body: { label?: string; ward?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request body." }, { status: 400 });
  }

  let label = sanitize(body.label || "");
  if (!label) {
    return NextResponse.json({ ok: false, error: "Invalid label." }, { status: 400 });
  }

  const account = privateKeyToAccount(pk);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const clients = (i: number) => {
    const transport = http(RPCS[i % RPCS.length]);
    return {
      pub: createPublicClient({ chain: sepolia, transport }),
      wallet: createWalletClient({ account, chain: sepolia, transport }),
    };
  };
  async function retry<T>(fn: (c: ReturnType<typeof clients>) => Promise<T>): Promise<T> {
    let last: unknown;
    for (let i = 0; i < RPCS.length * 2; i++) {
      try {
        return await fn(clients(i));
      } catch (e) {
        last = e;
        await sleep(2500);
      }
    }
    throw last;
  }

  try {
    // Avoid collisions: if the label is already registered, append a short suffix.
    const taken = async (l: string) => {
      const [status] = (await retry(({ pub }) =>
        pub.readContract({
          address: ENS_REGISTRY_ADDRESS,
          abi: ABI,
          functionName: "getState",
          args: [BigInt(keccak256(toHex(l)))],
        }),
      )) as readonly [number, bigint, bigint];
      return status === 2;
    };
    if (await taken(label)) {
      label = `${label}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);
    const txHash = await retry(({ wallet }) =>
      wallet.writeContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ABI,
        functionName: "register",
        args: [label, account.address, ZERO, RESOLVER, OWNER_ROLES, expiry],
        chain: sepolia,
        account,
      }),
    );
    await retry(({ pub }) => pub.waitForTransactionReceipt({ hash: txHash }));

    // EAC demo: delegate ONLY the scoped resolver right to the host address —
    // not blanket control. Best-effort (don't fail the whole registration on it).
    let grantTx: string | undefined;
    try {
      const host = getAddress(HOST_OPERATOR_ADDRESS.toLowerCase());
      grantTx = await retry(({ wallet }) =>
        wallet.writeContract({
          address: ENS_REGISTRY_ADDRESS,
          abi: ABI,
          functionName: "grantRoles",
          args: [BigInt(keccak256(toHex(label))), ROLE_SET_RESOLVER, host],
          chain: sepolia,
          account,
        }),
      );
    } catch {
      /* grant is a bonus; registration already succeeded */
    }

    return NextResponse.json({
      ok: true,
      label,
      name: `${label}.gomigo.eth`,
      txHash,
      grantTx,
      anyId: `0x${BigInt(keccak256(toHex(label))).toString(16)}`,
      registry: ENS_REGISTRY_ADDRESS,
      explorer: `https://sepolia.etherscan.io/tx/${txHash}`,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 200) : "On-chain registration failed.",
      },
      { status: 502 },
    );
  }
}
