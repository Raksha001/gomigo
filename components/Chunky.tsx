import Link from "next/link";
import { cn } from "@/lib/utils";

type Color = "lime" | "ink" | "pink" | "sky" | "grape" | "tangerine" | "white";

const COLOR: Record<Color, string> = {
  lime: "bg-lime text-ink",
  ink: "bg-ink text-white",
  pink: "bg-pink text-white",
  sky: "bg-sky text-ink",
  grape: "bg-grape text-white",
  tangerine: "bg-tangerine text-ink",
  white: "bg-white text-ink",
};

interface BaseProps {
  color?: Color;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}

const sizing = {
  sm: "px-3 py-2 text-sm border-2 shadow-comic-sm rounded-xl",
  md: "px-5 py-3 text-base border-[3px] shadow-comic rounded-2xl",
  lg: "px-6 py-4 text-lg border-4 shadow-comic-lg rounded-2xl",
};

const base =
  "press inline-flex items-center justify-center gap-2 border-ink font-display font-extrabold disabled:opacity-40 disabled:shadow-none disabled:active:translate-x-0 disabled:active:translate-y-0";

/** Chunky comic button (button element). */
export function ChunkyButton({
  color = "lime",
  size = "md",
  className,
  children,
  ...rest
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, COLOR[color], sizing[size], className)} {...rest}>
      {children}
    </button>
  );
}

/** Chunky comic link styled as a button. */
export function ChunkyLink({
  color = "lime",
  size = "md",
  className,
  href,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link href={href} className={cn(base, COLOR[color], sizing[size], className)}>
      {children}
    </Link>
  );
}
