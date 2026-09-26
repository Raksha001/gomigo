import { cn } from "@/lib/utils";

/** Segmented capacity meter (arcade style). */
export function CapacityBar({ value }: { value: number }) {
  const segs = 10;
  const filled = Math.round((value / 100) * segs);
  const tone =
    value >= 90 ? "bg-tangerine" : value >= 70 ? "bg-lime" : "bg-sky";
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-0.5">
        {Array.from({ length: segs }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 flex-1 rounded-[3px] border border-ink",
              i < filled ? tone : "bg-canvas",
            )}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-bold text-ink">{value}%</span>
    </div>
  );
}

/** Comic-bordered stat tile. */
export function StatTile({
  label,
  value,
  sub,
  color = "bg-white",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div className={cn("rounded-2xl border-[3px] border-ink p-3 shadow-comic-sm", color)}>
      <p className="font-display text-[10px] font-extrabold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-extrabold leading-none text-ink">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] font-semibold text-muted">{sub}</p>}
    </div>
  );
}

export function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const full = Math.round(value);
  return (
    <span className={cn("tracking-tight", size === "md" ? "text-base" : "text-xs")}>
      <span className="text-tangerine">{"★".repeat(full)}</span>
      <span className="text-muted/40">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: "AVAILABLE" | "FULL" }) {
  return (
    <span
      className={cn(
        "rounded-full border-2 border-ink px-2.5 py-0.5 font-display text-[11px] font-extrabold shadow-comic-sm",
        status === "AVAILABLE" ? "bg-lime text-ink" : "bg-tangerine text-ink",
      )}
    >
      {status === "AVAILABLE" ? "OPEN" : "FULL"}
    </span>
  );
}

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-2 border-ink bg-white px-2.5 py-1 font-display text-[11px] font-bold text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="comic-title font-display text-lg font-extrabold text-ink">
      {children}
    </h2>
  );
}

/** Labelled form field wrapper. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-xs font-extrabold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
