import type { Metadata, Viewport } from "next";
import { Baloo_2, M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";

const display = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GomiGo 芥 — Unlock Tokyo's bins",
  description:
    "GomiGo turns Tokyo's locked private dumpsters into a trustless public utility. Verify you're human with World ID, get a 10-minute gate PIN, and drop your trash. Hosts earn, collectors get gigs, ENSv2 runs the registry.",
};

export const viewport: Viewport = {
  themeColor: "#E4F843",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans text-ink">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
