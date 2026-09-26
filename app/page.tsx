import Link from "next/link";
import { ArrowRight, Lock, Ban, Coins } from "lucide-react";
import GomiKun from "@/components/GomiKun";
import { Pill, SectionTitle } from "@/components/ui";

export default function Landing() {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-4xl border-4 border-ink bg-lime p-5 shadow-comic-lg">
        <div className="halftone absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-display text-xs font-extrabold">
              GOMIGO ゴミゴー
            </span>
            <span className="rounded-full border-2 border-ink bg-ink px-3 py-1 font-display text-[11px] font-extrabold text-lime">
              ETHGlobal Tokyo
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <GomiKun mood="hungry" size={104} />
            <div>
              <h1 className="font-display text-3xl font-extrabold leading-[0.95] text-ink">
                Tokyo has<br />nowhere to<br />throw trash.
              </h1>
              <p className="mt-2 font-display text-sm font-bold text-ink/70">
                So we unlock the bins that already exist. 🔓
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Problem */}
      <section className="flex flex-col gap-3">
        <SectionTitle>The problem 🗑️❌</SectionTitle>
        <div className="grid grid-cols-1 gap-2">
          <ProblemRow
            icon={<Ban className="h-5 w-5" />}
            title="No public bins since 1995"
            body="After the subway attacks, Japan pulled street bins for security. Tourists lug bento boxes & PET bottles for hours."
            color="bg-pink text-white"
          />
          <ProblemRow
            icon={<Lock className="h-5 w-5" />}
            title="Private capacity sits locked"
            body="Cafes, izakayas & apartment mansions pay for licensed dumpsters — then padlock them so the public can't dump."
            color="bg-sky text-ink"
          />
          <ProblemRow
            icon={<Coins className="h-5 w-5" />}
            title="Illegal dumping = ¥10,000,000"
            body="Fuhō-tōki carries up to 5 years jail or ¥10M fines. Hosts won't open gates without trust."
            color="bg-tangerine text-ink"
          />
        </div>
      </section>

      {/* Solution */}
      <section className="rounded-4xl border-4 border-ink bg-slate p-5 text-white shadow-comic">
        <SectionTitle>
          <span className="text-lime">The fix</span>{" "}
          <span className="text-white">✨</span>
        </SectionTitle>
        <p className="mt-1 text-sm font-semibold text-white/80">
          Every locked bin becomes an <b className="text-lime">ENSv2 name</b>. Prove
          you&apos;re a real human with <b className="text-lime">World ID</b>, get a
          10-minute gate PIN, drop your trash. Hosts earn, collectors get gigs.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Step emoji="🔎" label="Find a bin near you" />
          <Step emoji="🪪" label="Verify you're human" />
          <Step emoji="🔓" label="Unlock & drop" />
        </div>
      </section>

      {/* Role picker */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Who are you? 👀</SectionTitle>
        <RoleCard
          href="/disposer"
          emoji="🧳"
          title="I need to throw trash"
          sub="Tourist / commuter — find a bin & unlock it"
          color="bg-pink text-white"
        />
        <RoleCard
          href="/host"
          emoji="🏠"
          title="I have a bin to rent"
          sub="Shop or home — earn ¥ per verified drop-off"
          color="bg-grape text-white"
        />
        <RoleCard
          href="/collector"
          emoji="🚛"
          title="I'll collect the trash"
          sub="Gig worker — empty full bins, get paid"
          color="bg-sky text-ink"
        />
      </section>

      {/* Sponsor strip */}
      <footer className="flex items-center justify-center gap-2 pb-2">
        <Pill className="bg-white">🪪 World ID</Pill>
        <Pill className="bg-white">🧬 ENSv2 · Sepolia</Pill>
      </footer>
    </div>
  );
}

function ProblemRow({
  icon,
  title,
  body,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  color: string;
}) {
  return (
    <div className="flex gap-3 rounded-3xl border-[3px] border-ink bg-white p-3 shadow-comic-sm">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink ${color}`}
      >
        {icon}
      </span>
      <div>
        <h3 className="font-display text-sm font-extrabold text-ink">{title}</h3>
        <p className="text-xs font-semibold leading-snug text-muted">{body}</p>
      </div>
    </div>
  );
}

function Step({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-white/30 bg-white/5 p-2">
      <div className="text-2xl">{emoji}</div>
      <p className="mt-1 text-[11px] font-bold leading-tight text-white/80">{label}</p>
    </div>
  );
}

function RoleCard({
  href,
  emoji,
  title,
  sub,
  color,
}: {
  href: string;
  emoji: string;
  title: string;
  sub: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`press flex items-center gap-3 rounded-3xl border-4 border-ink p-4 shadow-comic ${color}`}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink bg-white/90 text-3xl">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-extrabold leading-tight">{title}</h3>
        <p className="text-xs font-semibold opacity-80">{sub}</p>
      </div>
      <ArrowRight className="h-6 w-6 shrink-0" strokeWidth={2.8} />
    </Link>
  );
}
