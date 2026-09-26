import type { BinRecord } from "./ensv2";

/** A community review left on a bin. */
export interface Review {
  author: string;
  emoji: string;
  rating: number; // 1–5
  text: string;
}

/** How a disposer physically gains access once verified. */
export type AccessType = "keypad" | "staff" | "qr" | "open";

/**
 * A marketplace bin: the on-chain ENS record (BinRecord) enriched with the
 * off-chain marketplace data GomiGo tracks (host, economics, reviews, geo).
 */
export interface Bin extends BinRecord {
  /** URL-safe slug for routing, e.g. "bin-01-shibuya". */
  id: string;
  city: string;
  host: string;
  hostType: "shop" | "home" | "station";
  /** Unlock mechanism — not every bin has a smart lock. */
  accessType: AccessType;
  /** Photo stand-in for the arcade look. */
  emoji: string;
  /** Yen fee a disposer pays to unlock (split host / collector / platform). */
  pricePerDrop: number;
  /** Total yen this host has earned from this bin. */
  earnings: number;
  /** Verified drop-offs served. */
  dropCount: number;
  lat: number;
  lng: number;
  reviews: Review[];
  rating: number;
}

// Economics (demo). A ¥120 unlock fee is split across the three sides.
export const UNLOCK_FEE = 120;
export const HOST_SHARE = 0.7;
export const COLLECTOR_SHARE = 0.2;
export const PLATFORM_SHARE = 0.1;
export const POINTS_PER_DROP = 10;
export const COLLECTOR_PAYOUT = 250; // paid to a collector per emptied bin

/** Display copy for each access type — used on the Pass screen + bin detail. */
export function accessInfo(t: AccessType): {
  label: string;
  emoji: string;
  headline: string;
  howTo: string;
} {
  switch (t) {
    case "keypad":
      return {
        label: "Keypad / Padlock",
        emoji: "🔒",
        headline: "Enter the PIN on the lock",
        howTo: "Punch this PIN on the smart padlock / keypad at the gate.",
      };
    case "staff":
      return {
        label: "Staff verify",
        emoji: "🙋",
        headline: "Show this pass to staff",
        howTo: "Show this verified pass to the host's staff — they'll open the bin for you.",
      };
    case "qr":
      return {
        label: "QR check-in",
        emoji: "📷",
        headline: "Scan the bin's QR to check in",
        howTo: "Scan the GomiGo QR sticker on the bin to confirm you're there, then drop.",
      };
    case "open":
      return {
        label: "Open / honor",
        emoji: "🌱",
        headline: "Verified — drop responsibly",
        howTo: "This bin has no lock. Your verified pass is logged for accountability — combustibles & PET only.",
      };
  }
}

export function slugFromName(name: string): string {
  // bin-01-shibuya.gomigo.eth → bin-01-shibuya
  const [label, ward] = name.split(".");
  return `${label}-${ward}`;
}

// ---------------------------------------------------------------------------
// Pickup marketplace — a disposer books a collector to take their trash and
// deposit it into a host bin. Collector is paid in (simulated) crypto (USDC).
// ---------------------------------------------------------------------------

export type PickupReason = "no-bin" | "too-much" | "hurry" | "sorting";
export type PickupStatus = "open" | "accepted" | "completed";

export interface PickupRequest {
  id: string;
  /** Who booked it (disposer handle/emoji). */
  by: string;
  emoji: string;
  ward: string;
  /** Where to meet the disposer. */
  where: string;
  /** What trash, free text. */
  items: string;
  reason: PickupReason;
  /** Crypto fee offered to the collector, in USDC (simulated). */
  feeUsdc: number;
  status: PickupStatus;
  /** Set once a collector accepts. */
  collector?: string;
  /** Bin the collector deposited into (ENS subname id). */
  binId?: string;
  createdAt: number;
}

export const REASON_LABEL: Record<PickupReason, string> = {
  "no-bin": "🗺️ No bin nearby",
  "too-much": "🧺 Too much trash",
  hurry: "⏱️ In a hurry",
  sorting: "♻️ Needs sorting help",
};

/** Host earns this much (USDC, simulated) each time a collector deposits. */
export const HOST_DEPOSIT_SHARE_USDC = 0.5;

export function seedPickups(): PickupRequest[] {
  const now = Date.now();
  return [
    {
      id: `pk-${now}-1`,
      by: "Marco",
      emoji: "🇮🇹",
      ward: "shibuya",
      where: "Hachikō statue exit",
      items: "3 PET bottles, 2 bento boxes",
      reason: "no-bin",
      feeUsdc: 3,
      status: "open",
      createdAt: now - 4 * 60 * 1000,
    },
    {
      id: `pk-${now}-2`,
      by: "Aisha",
      emoji: "🇦🇪",
      ward: "shinjuku",
      where: "Golden Gai entrance",
      items: "Bag of combustibles after a group dinner",
      reason: "too-much",
      feeUsdc: 5,
      status: "open",
      createdAt: now - 12 * 60 * 1000,
    },
  ];
}

const SEED: Bin[] = [
  {
    id: "bin-01-shibuya",
    name: "bin-01-shibuya.gomigo.eth",
    label: "Cafe Mon Izakaya",
    host: "Cafe Mon",
    hostType: "shop",
    accessType: "keypad",
    city: "Tokyo",
    ward: "shibuya",
    emoji: "🍶",
    status: "AVAILABLE",
    capacity: 78,
    hours: "08:00–22:00",
    acceptedTypes: "🍱 Combustibles, 🥤 PET",
    pricePerDrop: 120,
    earnings: 8400,
    dropCount: 70,
    lat: 35.6598,
    lng: 139.7006,
    map: { x: 34, y: 42 },
    directions:
      "Punch the PIN on the smart padlock behind the Lawson alley. Combustibles & PET only.",
    onchain: false,
    rating: 4.6,
    reviews: [
      { author: "Marco", emoji: "🇮🇹", rating: 5, text: "Saved me carrying a bento box for 3 hours. Padlock opened instantly!" },
      { author: "Yuki", emoji: "🇯🇵", rating: 4, text: "Clean, easy to find. Alley is a bit narrow at night." },
    ],
  },
  {
    id: "bin-02-shibuya",
    name: "bin-02-shibuya.gomigo.eth",
    label: "Mansion Shibuya South",
    host: "Shibuya South Residents",
    hostType: "home",
    accessType: "keypad",
    city: "Tokyo",
    ward: "shibuya",
    emoji: "🏢",
    status: "AVAILABLE",
    capacity: 41,
    hours: "06:00–23:00",
    acceptedTypes: "🍱 Combustibles, 🥤 PET, 🍾 Glass",
    pricePerDrop: 100,
    earnings: 5200,
    dropCount: 52,
    lat: 35.6555,
    lng: 139.7043,
    map: { x: 62, y: 66 },
    directions:
      "Enter the PIN on the keypad at the South gate waste room. No oversized items.",
    onchain: false,
    rating: 4.8,
    reviews: [
      { author: "Aisha", emoji: "🇦🇪", rating: 5, text: "The waste room is spotless. Felt totally safe using it." },
    ],
  },
  {
    id: "bin-01-chiyoda",
    name: "bin-01-chiyoda.gomigo.eth",
    label: "Akihabara Station Hub",
    host: "Akiba Denki Co.",
    hostType: "station",
    accessType: "qr",
    city: "Tokyo",
    ward: "chiyoda",
    emoji: "🚉",
    status: "FULL",
    capacity: 96,
    hours: "24h",
    acceptedTypes: "🥤 PET only",
    pricePerDrop: 80,
    earnings: 12960,
    dropCount: 162,
    lat: 35.6984,
    lng: 139.7731,
    map: { x: 80, y: 20 },
    directions:
      "PIN opens the recycling cage at the Electric Town exit. PET bottles only.",
    onchain: false,
    rating: 4.3,
    reviews: [
      { author: "Sven", emoji: "🇸🇪", rating: 4, text: "24h access is clutch after a late train. Fills up fast though." },
      { author: "Mei", emoji: "🇹🇼", rating: 5, text: "So many vending machines nearby — perfect PET drop." },
    ],
  },
  {
    id: "bin-01-shinjuku",
    name: "bin-01-shinjuku.gomigo.eth",
    label: "Golden Gai Ramen-ya",
    host: "Ramen Tatsu",
    hostType: "shop",
    accessType: "staff",
    city: "Tokyo",
    ward: "shinjuku",
    emoji: "🍜",
    status: "AVAILABLE",
    capacity: 63,
    hours: "17:00–03:00",
    acceptedTypes: "🍱 Combustibles, 🥤 PET",
    pricePerDrop: 120,
    earnings: 3600,
    dropCount: 30,
    lat: 35.6938,
    lng: 139.7036,
    map: { x: 22, y: 24 },
    directions:
      "Padlock is on the bin cage beside the kitchen door in Golden Gai. Knock if staff are in.",
    onchain: false,
    rating: 4.9,
    reviews: [
      { author: "Diego", emoji: "🇲🇽", rating: 5, text: "Host waved at me — felt welcome, not sketchy. 10/10." },
    ],
  },
  {
    id: "bin-02-shinjuku",
    name: "bin-02-shinjuku.gomigo.eth",
    label: "Park Hyatt Service Bay",
    host: "West Shinjuku Homes",
    hostType: "home",
    accessType: "open",
    city: "Tokyo",
    ward: "shinjuku",
    emoji: "🏨",
    status: "AVAILABLE",
    capacity: 28,
    hours: "07:00–21:00",
    acceptedTypes: "🍱 Combustibles, 🥤 PET, 📦 Cardboard",
    pricePerDrop: 100,
    earnings: 2100,
    dropCount: 21,
    lat: 35.6852,
    lng: 139.6908,
    map: { x: 48, y: 82 },
    directions:
      "Keypad at the service bay roller door. Break down cardboard before dropping.",
    onchain: false,
    rating: 4.5,
    reviews: [],
  },
];

/** A fresh deep clone of the seed bins (store is mutable, in-memory). */
export function seedBins(): Bin[] {
  return SEED.map((b) => ({ ...b, reviews: b.reviews.map((r) => ({ ...r })) }));
}

// --- Disposer profile ------------------------------------------------------

export interface DropEvent {
  id: string;
  binId: string;
  binLabel: string;
  ward: string;
  pin: string;
  nullifierHash: string;
  points: number;
  at: number;
}

export interface Profile {
  handle: string;
  emoji: string;
  points: number;
  streak: number;
  bottles: number;
  combustibles: number;
}

export function seedProfile(): Profile {
  return {
    handle: "traveler.eth",
    emoji: "🧳",
    points: 40,
    streak: 1,
    bottles: 2,
    combustibles: 2,
  };
}

// Arcade level curve: 100 pts per level.
export function levelFromPoints(points: number) {
  const level = Math.floor(points / 100) + 1;
  const into = points % 100;
  const title =
    ["Litter Rookie", "Eco Cadet", "Bin Ranger", "Waste Wizard", "Gomi Master"][
      Math.min(level - 1, 4)
    ] ?? "Gomi Legend";
  return { level, into, toNext: 100 - into, title };
}

// --- Geo helpers -----------------------------------------------------------

/** Haversine distance in metres. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** ~80 m/min walking → "X min walk" label. */
export function walkLabel(meters: number): string {
  const min = Math.max(1, Math.round(meters / 80));
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km · ${min} min walk`;
  return `${Math.round(meters)} m · ${min} min walk`;
}

/** Default location if geolocation is denied: Shibuya Scramble Crossing. */
export const DEFAULT_LOCATION = { lat: 35.6595, lng: 139.7005 };
