"use client";

/**
 * lib/store.tsx — GomiGo in-memory app store (React context).
 *
 * Holds the marketplace state for all three roles (bins, disposer profile &
 * history, active access pass, collector earnings) and the mutations that drive
 * the economy. In-memory by design: state lives for the browser session and
 * resets on refresh — no backend, safe for a live demo.
 *
 * The one thing that is NOT here is World ID verification: that happens
 * server-side in /api/dropoff/verify (real proof check + ward-scoped rate
 * limit). This store consumes that endpoint's response and updates the economy.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COLLECTOR_PAYOUT,
  HOST_SHARE,
  POINTS_PER_DROP,
  seedBins,
  seedProfile,
  seedPickups,
  HOST_DEPOSIT_SHARE_USDC,
  type AccessType,
  type Bin,
  type DropEvent,
  type PickupRequest,
  type PickupReason,
  type Profile,
  type Review,
} from "./data";
import type { BinStatus } from "./ensv2";

export interface ActivePass {
  pin: string;
  expiresAt: number;
  binId: string;
  binLabel: string;
  ward: string;
  directions: string;
  acceptedTypes: string;
  accessType: AccessType;
  nullifierHash: string;
  simulated: boolean;
}

/** Shape returned by /api/dropoff/verify (mirrors the route). */
export interface VerifyResponse {
  ok: boolean;
  status: number;
  pin?: string;
  expiresAt?: number;
  ttlMs?: number;
  ward?: string;
  bin?: string;
  binLabel?: string;
  directions?: string;
  acceptedTypes?: string;
  nullifierHash?: string;
  simulated?: boolean;
  code?: string;
  error?: string;
}

interface CollectorJob {
  id: string;
  binId: string;
  binLabel: string;
  ward: string;
  payout: number;
  at: number;
}

interface StoreValue {
  bins: Bin[];
  profile: Profile;
  history: DropEvent[];
  activePass: ActivePass | null;
  lastError: VerifyResponse | null;
  /** Collector's crypto earnings, in USDC (simulated). */
  collectorUsdc: number;
  pickups: PickupRequest[];
  location: { lat: number; lng: number } | null;

  getBin: (id: string) => Bin | undefined;
  setLocation: (loc: { lat: number; lng: number }) => void;
  /** Apply a verify response: on success, mint the pass + update the economy. */
  applyVerify: (binId: string, res: VerifyResponse) => void;
  clearError: () => void;
  clearPass: () => void;
  /** Host: flip a bin AVAILABLE⇆FULL (ENS bin-status write). */
  toggleStatus: (binId: string, next?: BinStatus) => void;
  /** Host: list a new bin (mint subname + records). */
  addBin: (bin: Bin) => void;
  addReview: (binId: string, review: Review) => void;

  // --- Pickup marketplace ---
  /** Disposer: book a collector to take their trash. */
  requestPickup: (input: {
    ward: string;
    where: string;
    items: string;
    reason: PickupReason;
    feeUsdc: number;
  }) => void;
  /** Collector: accept an open pickup request. */
  acceptPickup: (id: string) => void;
  /** Collector: deposit the collected trash into a host bin → get paid in crypto. */
  completePickup: (id: string, binId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [bins, setBins] = useState<Bin[]>(() => seedBins());
  const [profile, setProfile] = useState<Profile>(() => seedProfile());
  const [history, setHistory] = useState<DropEvent[]>([]);
  const [activePass, setActivePass] = useState<ActivePass | null>(null);
  const [lastError, setLastError] = useState<VerifyResponse | null>(null);
  const [collectorUsdc, setCollectorUsdc] = useState(12.5);
  const [pickups, setPickups] = useState<PickupRequest[]>(() => seedPickups());
  const [location, setLocationState] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const getBin = useCallback((id: string) => bins.find((b) => b.id === id), [bins]);

  const setLocation = useCallback((loc: { lat: number; lng: number }) => {
    setLocationState(loc);
  }, []);

  const applyVerify = useCallback(
    (binId: string, res: VerifyResponse) => {
      if (!res.ok || !res.pin || !res.expiresAt) {
        setLastError(res);
        return;
      }
      setLastError(null);
      const bin = bins.find((b) => b.id === binId);

      setActivePass({
        pin: res.pin,
        expiresAt: res.expiresAt,
        binId,
        binLabel: res.binLabel ?? bin?.label ?? "Bin",
        ward: res.ward ?? bin?.ward ?? "",
        directions: res.directions ?? bin?.directions ?? "",
        acceptedTypes: res.acceptedTypes ?? bin?.acceptedTypes ?? "",
        accessType: bin?.accessType ?? "keypad",
        nullifierHash: res.nullifierHash ?? "0x",
        simulated: Boolean(res.simulated),
      });

      // Economy: host earns their share, bin fills a little, drop count ticks.
      setBins((prev) =>
        prev.map((b) =>
          b.id === binId
            ? {
                ...b,
                earnings: b.earnings + Math.round(b.pricePerDrop * HOST_SHARE),
                dropCount: b.dropCount + 1,
                capacity: Math.min(100, b.capacity + 3),
              }
            : b,
        ),
      );

      // Disposer: points, streak, impact stats, history.
      setProfile((p) => ({
        ...p,
        points: p.points + POINTS_PER_DROP,
        streak: p.streak + 1,
        bottles: p.bottles + 1,
        combustibles: p.combustibles + 1,
      }));
      setHistory((h) =>
        [
          {
            id: `${res.nullifierHash}-${Date.now()}`,
            binId,
            binLabel: res.binLabel ?? bin?.label ?? "Bin",
            ward: res.ward ?? bin?.ward ?? "",
            pin: res.pin!,
            nullifierHash: res.nullifierHash ?? "0x",
            points: POINTS_PER_DROP,
            at: Date.now(),
          },
          ...h,
        ].slice(0, 30),
      );
    },
    [bins],
  );

  const clearError = useCallback(() => setLastError(null), []);
  const clearPass = useCallback(() => setActivePass(null), []);

  const toggleStatus = useCallback((binId: string, next?: BinStatus) => {
    setBins((prev) =>
      prev.map((b) =>
        b.id === binId
          ? { ...b, status: next ?? (b.status === "AVAILABLE" ? "FULL" : "AVAILABLE") }
          : b,
      ),
    );
  }, []);

  const addBin = useCallback((bin: Bin) => {
    setBins((prev) => [bin, ...prev]);
  }, []);

  const collectBin = useCallback(
    (binId: string) => {
      const bin = bins.find((b) => b.id === binId);
      setBins((prev) =>
        prev.map((b) =>
          b.id === binId ? { ...b, status: "AVAILABLE", capacity: 0 } : b,
        ),
      );
      setCollectorEarnings((e) => e + COLLECTOR_PAYOUT);
      if (bin) {
        setCollectorJobs((jobs) =>
          [
            {
              id: `${binId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              binId,
              binLabel: bin.label,
              ward: bin.ward,
              payout: COLLECTOR_PAYOUT,
              at: Date.now(),
            },
            ...jobs,
          ].slice(0, 20),
        );
      }
    },
    [bins],
  );

  const addReview = useCallback((binId: string, review: Review) => {
    setBins((prev) =>
      prev.map((b) => {
        if (b.id !== binId) return b;
        const reviews = [review, ...b.reviews];
        const rating =
          reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        return { ...b, reviews, rating: Math.round(rating * 10) / 10 };
      }),
    );
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      bins,
      profile,
      history,
      activePass,
      lastError,
      collectorEarnings,
      collectorJobs,
      location,
      getBin,
      setLocation,
      applyVerify,
      clearError,
      clearPass,
      toggleStatus,
      addBin,
      collectBin,
      addReview,
    }),
    [
      bins,
      profile,
      history,
      activePass,
      lastError,
      collectorEarnings,
      collectorJobs,
      location,
      getBin,
      setLocation,
      applyVerify,
      clearError,
      clearPass,
      toggleStatus,
      addBin,
      collectBin,
      addReview,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
