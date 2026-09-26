/**
 * lib/ensv2.ts — ENSv2 (Sepolia beta) hierarchical subname resolver + scoped access control.
 *
 * GomiGo indexes every physical waste bin / apartment waste room as a hierarchical
 * subname under a parent registry:
 *
 *   bin-01.shibuya.gomigo.eth   → Cafe Mon Izakaya Dumpster
 *   bin-02.shibuya.gomigo.eth   → Mansion Shibuya South (residential waste room)
 *   bin-01.chiyoda.gomigo.eth   → Akihabara Station Hub
 *
 * Each bin's operational data lives in ENS *text records* resolved off the parent's
 * resolver via ENSv2 wildcard resolution:
 *   - bin-status      → "AVAILABLE" | "FULL"
 *   - capacity        → percentage full, e.g. "78"
 *   - hours           → access window, e.g. "08:00-22:00"
 *   - accepted-types  → emoji-tagged list, e.g. "🍱 Combustibles, 🥤 PET"
 *
 * ENSv2 Enhanced Access Control (EAC) is the shared, role-based permission system that
 * lets us delegate *only* the right to edit specific records. The registered host
 * address holds a scoped role that can write `bin-status` and `capacity` on its own
 * bin; disposers (tourists) get read-only resolution. See `getScopedRoles()`.
 *
 * Real `viem` contract methods are implemented below. Because the ENSv2 Sepolia beta
 * registry addresses shift during the beta and public RPC latency can spike during a
 * live demo, every read falls back to a deterministic mock record so the UI never
 * blocks. Set NEXT_PUBLIC_ENS_UNIVERSAL_RESOLVER to a live resolver to hit the chain.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  keccak256,
  namehash,
  parseAbi,
  toHex,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BinStatus = "AVAILABLE" | "FULL";

export interface BinRecord {
  /** Full hierarchical ENSv2 subname, e.g. bin-01.shibuya.gomigo.eth */
  name: string;
  /** Human label for the physical location. */
  label: string;
  /** Ward slug used for rate-limit scoping, e.g. "shibuya". */
  ward: string;
  /** ENS text record: bin-status. */
  status: BinStatus;
  /** ENS text record: capacity (percent, 0–100). */
  capacity: number;
  /** ENS text record: hours (access window). */
  hours: string;
  /** ENS text record: accepted-types. */
  acceptedTypes: string;
  /** Approx map coordinates (0–100 %) inside the Shibuya map card. */
  map: { x: number; y: number };
  /** Physical unlock directions shown once verified. */
  directions: string;
  /** Whether this record came from the chain (true) or the mock fallback (false). */
  onchain: boolean;
}

/** An EAC scoped role assignment for a given bin. */
export interface ScopedRole {
  role: "HOST_OPERATOR" | "COLLECTOR" | "DISPOSER";
  /** The role holder (host address, collector address, or "any" for public read). */
  holder: string;
  /** Records this role may write. Empty = read-only. */
  canWrite: Array<"bin-status" | "capacity" | "hours" | "accepted-types">;
  canRead: "all";
  /** For COLLECTOR: the only value it may write bin-status to. */
  constraint?: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export const UNIVERSAL_RESOLVER =
  (process.env.NEXT_PUBLIC_ENS_UNIVERSAL_RESOLVER as Address | undefined) ??
  undefined;

export const PARENT_NAME = "gomigo.eth";

/**
 * Registered host operator address (the demo host). In production this is the
 * account that ENSv2 EAC has granted the scoped write role on its bin subname.
 */
export const HOST_OPERATOR_ADDRESS: Address = getAddress(
  "0x1d2e4a9c9c3e7a0f2b5c6d7e8f90a1b2c3d4e5f6",
);

/**
 * Registered gig-collector address. Granted a constrained ENSv2 EAC role that
 * may only reset bin-status to AVAILABLE after emptying a bin.
 */
export const COLLECTOR_ADDRESS: Address = getAddress(
  "0x9ab7cd3e5f1234567890abcdef1234567890abcd",
);

// ENSv2 wildcard resolution mirrors the classic resolver text-record interface,
// so we can read via `resolve(name, calldata)` on the UniversalResolver or, when a
// direct resolver is known, `text(node, key)` on the resolver itself.
const RESOLVER_ABI = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
  "function setText(bytes32 node, string key, string value)",
]);

// ---------------------------------------------------------------------------
// Live ENSv2 registry (OUR deployed subname registry on Sepolia)
// ---------------------------------------------------------------------------
// Deployed via VerifiableFactory (proxy of ENS's UserRegistryImpl). Every bin is
// a tokenized subname registered in it; the app reads registration state LIVE.

export const ENS_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_ENS_REGISTRY as Address | undefined) ??
  ("0x6Fdec1496fe8ff0c07b815d72A53A014d6072ff6" as Address);

/** Chain id + explorer for building live links. */
export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

const REGISTRY_ABI = parseAbi([
  "function getState(uint256 anyId) view returns (uint8 status, uint64 expiry, uint256 tokenId)",
  "function hasRoles(uint256 anyId, uint256 roleBitmap, address account) view returns (bool)",
]);

export interface OnchainBin {
  /** The subname label registered on-chain (equals the bin id, e.g. bin-01-shibuya). */
  label: string;
  /** keccak256(label) — the registry "anyId". */
  anyId: string;
  /** Registered on our ENSv2 registry (status == 2). */
  registered: boolean;
  /** Unix expiry of the subname. */
  expiry: number;
  registry: Address;
}

/** ENSv2 EAC role bit for setting a name's resolver (nybble 6). */
export const ROLE_SET_RESOLVER = 1n << 24n;
export const ROLE_REGISTRAR = 1n << 0n;

/** keccak256 of the label, as the registry's uint256 "anyId". */
export function labelToAnyId(label: string): bigint {
  return BigInt(keccak256(toHex(label)));
}

/**
 * Read a contract call across several Sepolia RPCs, returning the first success.
 * Public RPCs (1rpc.io etc.) rate-limit browser reads, so we fall back rather
 * than let a single throttled endpoint blank out the on-chain UI.
 */
const READ_RPCS = [
  SEPOLIA_RPC_URL,
  "https://ethereum-sepolia.publicnode.com",
  "https://sepolia.drpc.org",
  "https://1rpc.io/sepolia",
].filter((v, i, a) => v && a.indexOf(v) === i) as string[];

async function readWithFallback<T>(
  params: Parameters<PublicClient["readContract"]>[0],
): Promise<T> {
  let lastErr: unknown;
  for (const url of READ_RPCS) {
    try {
      const client = createPublicClient({ chain: sepolia, transport: http(url) });
      return (await client.readContract(params)) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/**
 * Read a bin subname's live registration state from our ENSv2 registry on
 * Sepolia. Returns null if all RPCs fail (so the UI can fall back gracefully).
 */
export async function readOnchainBin(label: string): Promise<OnchainBin | null> {
  try {
    const anyId = labelToAnyId(label);
    const [status, expiry] = await readWithFallback<readonly [number, bigint, bigint]>({
      address: ENS_REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "getState",
      args: [anyId],
    });
    return {
      label,
      anyId: `0x${anyId.toString(16)}`,
      registered: status === 2,
      expiry: Number(expiry),
      registry: ENS_REGISTRY_ADDRESS,
    };
  } catch {
    return null;
  }
}

/**
 * Read whether an account holds a given EAC role on a subname — used to show the
 * scoped-role delegation live (host has SET_RESOLVER but not REGISTRAR).
 */
export async function readHasRole(
  label: string,
  role: bigint,
  account: Address,
): Promise<boolean | null> {
  try {
    return await readWithFallback<boolean>({
      address: ENS_REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "hasRoles",
      args: [labelToAnyId(label), role, account],
    });
  } catch {
    return null;
  }
}


// ---------------------------------------------------------------------------
// Deterministic mock fallback (used when RPC is unreachable / resolver unset)
// ---------------------------------------------------------------------------

const MOCK_BINS: Record<string, BinRecord> = {
  "bin-01.shibuya.gomigo.eth": {
    name: "bin-01.shibuya.gomigo.eth",
    label: "Cafe Mon Izakaya Dumpster",
    ward: "shibuya",
    status: "AVAILABLE",
    capacity: 78,
    hours: "08:00-22:00",
    acceptedTypes: "🍱 Combustibles, 🥤 PET",
    map: { x: 34, y: 42 },
    directions:
      "Punch PIN on smart padlock behind the Lawson alley. Combustibles & PET only.",
    onchain: false,
  },
  "bin-02.shibuya.gomigo.eth": {
    name: "raksha",
    label: "Mansion Shibuya South — Waste Room",
    ward: "shibuya",
    status: "AVAILABLE",
    capacity: 41,
    hours: "06:00-23:00",
    acceptedTypes: "🍱 Combustibles, 🥤 PET, 🍾 Glass",
    map: { x: 62, y: 66 },
    directions:
      "Enter PIN on the keypad at the South gate waste room. No oversized items.",
    onchain: false,
  },
  "bin-01.chiyoda.gomigo.eth": {
    name: "bin-01.chiyoda.gomigo.eth",
    label: "Akihabara Station Hub",
    ward: "chiyoda",
    status: "FULL",
    capacity: 96,
    hours: "24h",
    acceptedTypes: "🥤 PET only",
    map: { x: 78, y: 22 },
    directions:
      "PIN opens the recycling cage at Electric Town exit. PET bottles only.",
    onchain: false,
  },
};

export const BIN_NAMES = Object.keys(MOCK_BINS);

export function getMockBin(name: string): BinRecord | undefined {
  const rec = MOCK_BINS[name];
  return rec ? { ...rec } : undefined;
}

export function getAllMockBins(): BinRecord[] {
  return Object.values(MOCK_BINS).map((b) => ({ ...b }));
}

// ---------------------------------------------------------------------------
// viem clients
// ---------------------------------------------------------------------------

let _publicClient: PublicClient | null = null;

/** Shared read-only Sepolia client. */
export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: sepolia,
      transport: http(SEPOLIA_RPC_URL),
    });
  }
  return _publicClient;
}

/**
 * Browser wallet client (host console writes). Requires window.ethereum on
 * Sepolia and an account holding the EAC scoped write role.
 */
export function getWalletClient(): WalletClient | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) return null;
  return createWalletClient({
    chain: sepolia,
    transport: custom(eth as Parameters<typeof custom>[0]),
  });
}

// ---------------------------------------------------------------------------
// ENSv2 reads (text records) with mock fallback
// ---------------------------------------------------------------------------

/**
 * Resolve a single ENS text record for a hierarchical subname on Sepolia.
 * Uses direct resolver `text(node, key)`; returns null on any failure so the
 * caller can fall back to a mock value.
 */
export async function readTextRecord(
  name: string,
  key: string,
  resolver?: Address,
): Promise<string | null> {
  const target = resolver ?? UNIVERSAL_RESOLVER;
  if (!target) return null;
  try {
    const node = namehash(name);
    const value = await getPublicClient().readContract({
      address: target,
      abi: RESOLVER_ABI,
      functionName: "text",
      args: [node, key],
    });
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a full bin record for a hierarchical subname. Reads the four ENS text
 * records off-chain via wildcard resolution and merges over the mock baseline so
 * any record the chain does not (yet) serve stays populated for the demo.
 */
export async function resolveBin(name: string): Promise<BinRecord | null> {
  const base = getMockBin(name);
  if (!base) return null;

  if (!UNIVERSAL_RESOLVER) {
    return base; // No resolver configured → deterministic mock.
  }

  const [status, capacity, hours, acceptedTypes] = await Promise.all([
    readTextRecord(name, "bin-status"),
    readTextRecord(name, "capacity"),
    readTextRecord(name, "hours"),
    readTextRecord(name, "accepted-types"),
  ]);

  const anyOnchain = Boolean(status || capacity || hours || acceptedTypes);

  return {
    ...base,
    status: (status as BinStatus) || base.status,
    capacity: capacity ? Number.parseInt(capacity, 10) || base.capacity : base.capacity,
    hours: hours || base.hours,
    acceptedTypes: acceptedTypes || base.acceptedTypes,
    onchain: anyOnchain,
  };
}

/** Resolve every indexed bin, in parallel. */
export async function resolveAllBins(): Promise<BinRecord[]> {
  return Promise.all(
    BIN_NAMES.map(async (n) => (await resolveBin(n)) ?? getMockBin(n)!),
  );
}

// ---------------------------------------------------------------------------
// ENSv2 writes (host, EAC scoped role) with mock fallback
// ---------------------------------------------------------------------------

export interface WriteResult {
  ok: boolean;
  txHash?: Hex;
  simulated: boolean;
  message: string;
}

/**
 * Write the `bin-status` text record for a bin. Only an account holding the
 * ENSv2 EAC HOST_OPERATOR scoped role on this subname is authorized on-chain to
 * write `bin-status` / `capacity`; disposers cannot. When no resolver / wallet is
 * available we simulate the write so the host console still demos end-to-end.
 */
export async function setBinStatus(
  name: string,
  status: BinStatus,
): Promise<WriteResult> {
  const wallet = getWalletClient();

  if (!UNIVERSAL_RESOLVER || !wallet) {
    return {
      ok: true,
      simulated: true,
      message: `Simulated ENS write: ${name} bin-status → ${status} (connect a Sepolia host wallet with the scoped role to broadcast on-chain).`,
    };
  }

  try {
    const [account] = await wallet.getAddresses();
    const node = namehash(name);
    const txHash = await wallet.writeContract({
      account,
      chain: sepolia,
      address: UNIVERSAL_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [node, "bin-status", status],
    });
    return {
      ok: true,
      txHash,
      simulated: false,
      message: `ENS text record updated on Sepolia: ${name} bin-status → ${status}`,
    };
  } catch (err) {
    return {
      ok: false,
      simulated: false,
      message:
        err instanceof Error
          ? `ENS write failed: ${err.message}`
          : "ENS write failed (is your account granted the EAC scoped role?)",
    };
  }
}

/** Update the `capacity` text record (host scoped role). */
export async function setBinCapacity(
  name: string,
  capacity: number,
): Promise<WriteResult> {
  const wallet = getWalletClient();
  if (!UNIVERSAL_RESOLVER || !wallet) {
    return {
      ok: true,
      simulated: true,
      message: `Simulated ENS write: ${name} capacity → ${capacity}%`,
    };
  }
  try {
    const [account] = await wallet.getAddresses();
    const node = namehash(name);
    const txHash = await wallet.writeContract({
      account,
      chain: sepolia,
      address: UNIVERSAL_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [node, "capacity", String(capacity)],
    });
    return {
      ok: true,
      txHash,
      simulated: false,
      message: `ENS capacity updated on Sepolia: ${name} → ${capacity}%`,
    };
  } catch (err) {
    return {
      ok: false,
      simulated: false,
      message:
        err instanceof Error ? `ENS write failed: ${err.message}` : "ENS write failed",
    };
  }
}

// ---------------------------------------------------------------------------
// ENSv2 Enhanced Access Control — scoped role model
// ---------------------------------------------------------------------------

/**
 * The scoped-role assignments that back GomiGo's permission model. In ENSv2
 * these are granted via Enhanced Access Control on the bin's Permissioned
 * Resolver. GomiGo's three-sided marketplace maps to three roles, each with a
 * different write scope over the same name:
 *   - HOST_OPERATOR: owns the bin, writes every operational record.
 *   - COLLECTOR: a gig worker granted a *constrained* role — may only reset
 *     bin-status to AVAILABLE (and capacity to 0) after physically emptying it.
 *   - DISPOSER: public, read-only wildcard resolution.
 */
export function getScopedRoles(bin: string): ScopedRole[] {
  return [
    {
      role: "HOST_OPERATOR",
      holder: HOST_OPERATOR_ADDRESS,
      canWrite: ["bin-status", "capacity", "hours", "accepted-types"],
      canRead: "all",
      description: `Host of ${bin} — full EAC scope over its operational records. Cannot transfer the name or edit sibling bins.`,
    },
    {
      role: "COLLECTOR",
      holder: COLLECTOR_ADDRESS,
      canWrite: ["bin-status", "capacity"],
      canRead: "all",
      constraint: "bin-status → AVAILABLE only",
      description: `Gig collector — constrained EAC scope: may only reset bin-status to AVAILABLE and capacity to 0 after emptying. Cannot set FULL, change hours, or edit accepted-types.`,
    },
    {
      role: "DISPOSER",
      holder: "any",
      canWrite: [],
      canRead: "all",
      description:
        "Tourists / commuters — public wildcard resolution grants read-only access to every text record. No write permissions.",
    },
  ];
}
