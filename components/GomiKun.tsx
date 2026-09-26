import { cn } from "@/lib/utils";

/**
 * GomiKun — the app mascot: a chunky trash can with a face. `mood` changes the
 * eyes/mouth; `size` scales it. Pure SVG, no assets.
 */
export default function GomiKun({
  mood = "happy",
  size = 96,
  className,
  animate = true,
}: {
  mood?: "happy" | "hungry" | "sleepy" | "party" | "sad";
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const eyes: Record<string, JSX.Element> = {
    happy: (
      <>
        <circle cx="34" cy="48" r="4.5" fill="#212121" />
        <circle cx="62" cy="48" r="4.5" fill="#212121" />
      </>
    ),
    hungry: (
      <>
        <circle cx="34" cy="46" r="5.5" fill="#212121" />
        <circle cx="62" cy="46" r="5.5" fill="#212121" />
        <circle cx="35.5" cy="44.5" r="1.6" fill="#fff" />
        <circle cx="63.5" cy="44.5" r="1.6" fill="#fff" />
      </>
    ),
    sleepy: (
      <>
        <path d="M28 48 h12" stroke="#212121" strokeWidth="4" strokeLinecap="round" />
        <path d="M56 48 h12" stroke="#212121" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
    party: (
      <>
        <path d="M28 50 l6 -6 l6 6" stroke="#212121" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M56 50 l6 -6 l6 6" stroke="#212121" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    sad: (
      <>
        <circle cx="34" cy="50" r="4.5" fill="#212121" />
        <circle cx="62" cy="50" r="4.5" fill="#212121" />
      </>
    ),
  };

  const mouth: Record<string, JSX.Element> = {
    happy: <path d="M38 60 q10 8 20 0" stroke="#212121" strokeWidth="4" fill="none" strokeLinecap="round" />,
    hungry: <ellipse cx="48" cy="62" rx="9" ry="7" fill="#FF5DA2" stroke="#212121" strokeWidth="3" />,
    sleepy: <path d="M42 62 h12" stroke="#212121" strokeWidth="4" fill="none" strokeLinecap="round" />,
    party: <path d="M36 58 q12 12 24 0 q-12 4 -24 0" fill="#FF5DA2" stroke="#212121" strokeWidth="3" strokeLinejoin="round" />,
    sad: <path d="M38 64 q10 -8 20 0" stroke="#212121" strokeWidth="4" fill="none" strokeLinecap="round" />,
  };

  return (
    <div
      className={cn(animate && "animate-float", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 96 96" width={size} height={size} aria-label="Gomi-kun mascot">
        {/* lid */}
        <rect x="20" y="20" width="56" height="12" rx="5" fill="#E4F843" stroke="#212121" strokeWidth="4" />
        <rect x="42" y="12" width="12" height="10" rx="4" fill="#E4F843" stroke="#212121" strokeWidth="4" />
        {/* body */}
        <path
          d="M26 32 h44 l-4 50 a6 6 0 0 1 -6 5 h-24 a6 6 0 0 1 -6 -5 z"
          fill="#fff"
          stroke="#212121"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* ridges */}
        <path d="M34 40 v40 M48 40 v42 M62 40 v40" stroke="#212121" strokeWidth="2.5" opacity="0.25" />
        {eyes[mood]}
        {mouth[mood]}
        {/* cheeks */}
        <circle cx="28" cy="58" r="4" fill="#FF5DA2" opacity="0.5" />
        <circle cx="68" cy="58" r="4" fill="#FF5DA2" opacity="0.5" />
      </svg>
    </div>
  );
}
