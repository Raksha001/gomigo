import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GomiGo core palette (civic base) + arcade pop accents
        canvas: "#F6F6F6", // matte off-white app background
        ink: "#212121", // solid primary black (text / borders / CTA)
        slate: "#263850", // map containers, dark panels
        lime: "#E4F843", // primary pop — pins, pass card, CTAs
        muted: "#637F94", // ENS labels, subtitles, secondary chips
        surface: "#FFFFFF", // white cards
        // arcade accents (used sparingly for role coding + fun)
        pink: "#FF5DA2", // disposer / points
        sky: "#4CC9F0", // collector
        grape: "#9B5DE5", // host
        tangerine: "#FF8A3D", // warnings / streaks
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        // hard "comic" offset shadows (no blur) — the arcade signature
        comic: "4px 4px 0 0 #212121",
        "comic-sm": "2px 2px 0 0 #212121",
        "comic-lg": "6px 6px 0 0 #212121",
        "comic-xl": "8px 8px 0 0 #212121",
        "comic-lime": "4px 4px 0 0 #E4F843",
        xs: "0 1px 2px 0 rgba(33, 33, 33, 0.05)",
      },
      keyframes: {
        "pin-ping": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        wobble: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-10vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0" },
        },
        "chomp": {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(0.55)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "pin-ping": "pin-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        wobble: "wobble 1.6s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "pop-in": "pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "confetti-fall": "confetti-fall 2.6s linear forwards",
        chomp: "chomp 0.5s ease-in-out",
        marquee: "marquee 18s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
