"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Ticket, Store, Truck, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/disposer", label: "Map", icon: Map, color: "text-pink" },
  { href: "/collector", label: "Collect", icon: Truck, color: "text-sky" },
  { href: "/pass", label: "Pass", icon: Ticket, color: "text-ink" },
  { href: "/host", label: "Host", icon: Store, color: "text-grape" },
  { href: "/profile", label: "Me", icon: Smile, color: "text-tangerine" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activePass } = useStore();

  return (
    <div className="min-h-screen w-full py-0 sm:py-6">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden border-4 border-ink bg-canvas shadow-comic-xl sm:min-h-[calc(100vh-3rem)] sm:rounded-[40px]">
        {/* Scroll area */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-4 pb-28 sm:p-5 sm:pb-28">
          {children}
        </div>

        {/* Bottom nav */}
        <nav className="absolute inset-x-0 bottom-0 z-40 border-t-4 border-ink bg-white/95 px-2 py-2 backdrop-blur">
          <ul className="flex items-end justify-between">
            {TABS.map((t) => {
              const active =
                pathname === t.href || pathname.startsWith(`${t.href}/`);
              const Icon = t.icon;
              const isPass = t.href === "/pass";
              return (
                <li key={t.href} className="flex-1">
                  <Link
                    href={t.href}
                    className={cn(
                      "relative mx-auto flex w-full flex-col items-center gap-0.5 rounded-2xl py-1.5 font-display text-[11px] font-extrabold transition",
                      active ? "text-ink" : "text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border-2 transition",
                        active
                          ? "border-ink bg-lime shadow-comic-sm"
                          : "border-transparent",
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.6} />
                    </span>
                    {t.label}
                    {isPass && activePass && (
                      <span className="absolute right-3 top-0 h-3 w-3 animate-pin-ping rounded-full bg-pink" />
                    )}
                    {isPass && activePass && (
                      <span className="absolute right-3 top-0 h-3 w-3 rounded-full border-2 border-ink bg-pink" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
