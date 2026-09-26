"use client";

import { useEffect, useState } from "react";

/**
 * ConfettiBurst — dependency-free arcade confetti. Renders a burst of falling
 * emoji/coloured chips when `fire` flips true. Auto-clears after the animation.
 */
const PIECES = ["🗑️", "🥤", "🍱", "♻️", "⭐", "💴", "✨"];
const COLORS = ["#E4F843", "#FF5DA2", "#4CC9F0", "#9B5DE5", "#FF8A3D"];

export default function ConfettiBurst({ fire }: { fire: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!fire) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2800);
    return () => clearTimeout(t);
  }, [fire]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const dur = 2 + Math.random() * 1.2;
        const useEmoji = i % 3 === 0;
        return (
          <span
            key={i}
            className="absolute top-0 animate-confetti-fall text-lg"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
            }}
          >
            {useEmoji ? (
              PIECES[i % PIECES.length]
            ) : (
              <span
                className="inline-block h-3 w-3 rounded-[2px]"
                style={{ background: COLORS[i % COLORS.length] }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
