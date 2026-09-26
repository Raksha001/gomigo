# GomiGo ゴミゴー 🗑️

**We don't add bins to Tokyo. We unlock the ones that are already there.**

GomiGo turns Tokyo's locked private dumpsters and apartment waste rooms into a
trustless public utility. A tourist proves they're a real human with **World ID**,
gets a 10-minute gate PIN, and drops their trash. Every bin is an **ENSv2** name.
Hosts earn, gig collectors get paid, and the city's streets stay clean.

Built for **ETHGlobal Tokyo** against two sponsor tracks:

- 🪪 **World ID — Best Use of IDKit** ($5,000)
- 🧬 **Best Use of ENSv2 on Sepolia** ($6,000)

---

## The problem

- **No public bins since 1995.** After the Tokyo subway attacks, Japan
  systematically removed street bins for security and to cut costs. Commuters and
  tourists carry bento boxes, cups and PET bottles in their bags for hours.
- **Private capacity sits locked.** Convenience stores, izakayas, cafes and
  apartment *mansions* pay for licensed dumpsters — then secure them with padlocks
  and keypads behind back gates so the public can't dump in them.
- **Illegal dumping is a serious crime.** Under Japan's Waste Management Law,
  *fuhō-tōki* carries up to **5 years imprisonment or ¥10,000,000 in fines**. Hosts
  won't open their gates to strangers without a way to trust them.

The trash isn't missing — it's **locked**. The blocker is trust.

## The solution — a three-sided marketplace

GomiGo manufactures the missing trust and turns dormant private capacity into
shared infrastructure. Three actors:

| Actor | Does | Gets |
| --- | --- | --- |
| 🧳 **Disposer** (tourist) | Finds a nearby bin, proves humanity with World ID, unlocks a 10-min PIN — **or books a pickup** when no bin is reachable | A place to throw trash + Gomi Points |
| 🏠 **Host** (shop / home) | Lists their locked bin as an ENS subname, sets records | **¥ per verified drop-off** |
| 🚛 **Collector** (gig worker) | Accepts a disposer's **pickup request**, takes their trash, and deposits it into a host bin using their scoped ENS role | **Crypto (USDC) per pickup** |

**Two ways to dispose.** If a bin is nearby, the disposer unlocks it directly
(World ID → PIN). If not — too much trash, in a hurry, no bin around, or unsure of
Japan's strict sorting — they **book a collector**, who picks the trash up and
deposits it into an ENS-registered host bin, paid in crypto. Either way the trash
lands in a licensed bin, and every actor is a verified/rate-limited participant.

The unlock only happens behind a **World ID proof** (Sybil-safe, private) and every
bin's identity + live state lives in **ENSv2** (self-owned, addressable, role-gated).

## Why *both* sponsors are load-bearing (not cosmetic)

- **ENS without World ID** = an open directory of unlocked bins → instant abuse,
  hosts pull out.
- **World ID without ENS** = verified humans with nowhere addressable to send them
  and no host-controlled state.
- **Together** = dormant private capacity becomes a trustless public utility.

---

## Screens

| Route | Screen |
| --- | --- |
| `/` | Landing — problem → solution → role picker |
| `/disposer` | Map (geolocation) + nearest-bin list, ward filter, "request a pickup" |
| `/bin/[id]` | Bin detail — live ENSv2 registration + EAC roles, host earnings, reviews, verify + judge sim |
| `/pickup` | Book a collector — meet-spot, items, reason, USDC offer (disposer with no bin nearby) |
| `/pass` | Active access pass — big PIN, countdown ring, access-mode instructions, confetti |
| `/host` | Host dashboard — earnings, EAC roles, bin status toggles (ENS writes) |
| `/host/new` | List-a-bin flow — registers a real ENSv2 subname on-chain + delegates EAC role |
| `/collector` | Pickup board — accept requests, deposit into a host bin, earn USDC (simulated) |
| `/profile` | Disposer profile — level, streak, impact, drop history |

---

## Run it

```bash
npm install
cp .env.local.example .env.local   # optional — app runs fully without it
npm run dev                         # http://localhost:3000
```

Fully demoable **with zero config**: ENS reads fall back to deterministic mock
records, and every bin detail page has **Judge Simulation** buttons that drive the
success + failure paths without the World app. Add real env vars to go live.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WLD_APP_ID` | World ID app id (`app_…`) |
| `NEXT_PUBLIC_WLD_ACTION` | Universal action id (`gomigo-dropoff`) |
| `NEXT_PUBLIC_WLD_RP_ID` | Registered Relying Party id (`rp_…`) |
| `WLD_RP_PRIVATE_KEY` | **Server-only** RP signer key (signs `rp_context`) |
| `WLD_STAGING_TOKEN` | **Server-only** 24h sandbox verification token |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Sepolia JSON-RPC endpoint |
| `NEXT_PUBLIC_ENS_UNIVERSAL_RESOLVER` | ENSv2 resolver address for on-chain reads/writes |

---

## World ID Integration Debrief

**The trust moment.** Issuing a PIN that physically unlocks a private dumpster is
exactly the event World ID is built for: before granting access we must know the
requester is a *unique human*, because an unlimited PIN faucet would immediately be
abused for illegal dumping (the ¥10M crime hosts fear). We do **not** need to know
*who* they are.

**Minimum sufficient assurance — Proof of Human.** The bar for opening a bin is
"one real, unique, rate-limitable human," not knowing *who* they are. **Proof of
Human** meets exactly that: it proves a unique, live human (strong Sybil
resistance) while revealing **nothing** personally identifying — so we can enforce
"1 pass / ward / day" and shut out bots/scripts farming PINs, without collecting a
shred of identity. We deliberately request *only* this: no name, nationality, age,
or document data, because the trust decision doesn't need them. Requesting a
document credential would over-collect PII for zero product benefit; requesting
nothing would reopen the Sybil-dumping hole. Proof of Human is the floor that
closes the abuse vector.

> **Credential roadmap note.** Our ideal *production* credential for this use case
> is **Passport/NFC** — foreign tourists carry a passport but have never visited an
> Orb, so it maximises accessibility. World's Passport credential is currently
> "coming soon," so the live demo uses Proof of Human. Swapping is a **one-line
> preset change** (`proofOfHuman()` → `passport()` in `DropoffModal.tsx`) the moment
> Passport ships — the rest of the 4.0 pipeline is credential-agnostic.

**One universal action, ward-scoped server-side.** GomiGo uses a **single** World
ID action (`gomigo-dropoff`) for every bin in every ward and city. World derives
the `nullifier_hash` from `(app_id, action, person)`, so one human gets one stable
nullifier everywhere — and GomiGo scopes the rate limit itself on `ward:nullifier`.
Expanding to a new ward or city needs **zero** new World ID config, while still
enforcing "1 pass / ward / day." The bin's ENS subname is passed as the proof
`signal` for tamper-proof traceability.

**Where verification happens (World ID 4.0).** GomiGo runs the current World ID
4.0 flow. The app is a registered **Relying Party** (`rp_…`) on the Developer
Portal, with the action `gomigo-dropoff` created on-chain. Each verification:

1. The client asks the server for a signed **`rp_context`** — a nonce + timestamps
   signed by the RP's ECDSA key ([app/api/worldid/context/route.ts](app/api/worldid/context/route.ts),
   built with `@worldcoin/idkit-server`'s `signRequest`). **The RP private key
   never leaves the server.**
2. `IDKitRequestWidget` requests a **Proof of Human** credential
   (`proofOfHuman()` preset, `allow_legacy_proofs`) — [components/DropoffModal.tsx](components/DropoffModal.tsx).
3. The proof is posted to [app/api/dropoff/verify/route.ts](app/api/dropoff/verify/route.ts),
   which verifies it at **`developer.world.org/api/v4/verify/{rp_id}`** and
   rate-limits on the RP-scoped `nullifier` from `responses[0]`.

**Failure-path architecture (the meaningful alternative paths).**

| Outcome | HTTP | Behaviour |
| --- | --- | --- |
| ✅ Success | `200` | Dynamic 4-digit PIN, 10-minute countdown, gate directions |
| 🚫 Duplicate nullifier within 24h (ward cap) | `429` | `"Daily quota exceeded for {Ward} Ward. Gate PIN generation suppressed."` |
| ⚠️ Cancelled / invalid / incomplete proof | `400` | Visible error, no PIN issued |
| 🔌 World service unreachable | `502` | Retryable error surfaced to the user |

Each path renders a distinct UI state. The nullifier cache is an in-memory `Map`
keyed by `ward:nullifier`, so the same human is capped per ward, not globally.

**Integration debrief / feedback.**

- **Time to first success:** the hard part was discovering the platform had moved
  to **World ID 4.0** (RP registration, `rp_context` signing, `/api/v4` verify) —
  our first pass targeted the older v2/`app_id` flow and got `"Action not found"`.
  Once we used the Developer Portal **MCP** (`configure_world_id` →
  `create_world_id_action` → `rotate_world_id_signing_key`) the path was ~45 min.
- **Friction:** the 3.0→4.0 transition is under-documented. The verify body
  requirements (`issuer_schema_id`, `expires_at_min` on each response) and the
  `rp_context` signing scheme (`signRequest` in `@worldcoin/idkit-server`, EIP-191
  over `version||nonce||createdAt||expiresAt||action`) had to be reverse-engineered
  from the SDK types. The `x-staging-verification-token` header for sandbox proofs
  is easy to miss.
- **Missing capability:** a first-class *scoped* rate-limit primitive (e.g. "N per
  action per region per day") would remove our need for a custom nullifier cache;
  and clearer end-to-end 4.0 sample code (context signing → widget → v4 verify).
- **Highest-impact improvement:** publish a copy-pasteable 4.0 quickstart that
  shows the `rp_context` round-trip; it's the single biggest source of confusion.

---

## ENSv2 Hierarchical Setup

ENSv2 is **central and live on Sepolia**, not mocked. We **own `gomigo.eth`**,
**deployed our own subname registry**, **wired the two together**, and register every
bin as a **tokenized subname** — so `bin-01-shibuya.gomigo.eth` resolves through
our registry. The app reads registration state and EAC roles **live from chain**.
See [lib/ensv2.ts](lib/ensv2.ts) and [scripts/ens/](scripts/ens/).

**Deployed on Sepolia (real transactions):**

| Thing | Address / proof |
| --- | --- |
| **`gomigo.eth`** — registered via ENSv2 ETHRegistrar (commit-reveal, paid in test USDC) | owner `0xB819…03Da` · [register tx `0x52ef…bcc9`](https://sepolia.etherscan.io/tx/0x52ef8c9e87d19f58d40b9df1974cc47a93502f2da2e215d43b7f1168a104bcc9) |
| **Our subname registry** (VerifiableFactory proxy of ENS's `UserRegistryImpl`) | [`0x6Fdec1496fe8ff0c07b815d72A53A014d6072ff6`](https://sepolia.etherscan.io/address/0x6Fdec1496fe8ff0c07b815d72A53A014d6072ff6) |
| **`setSubregistry`** — `gomigo.eth` → our registry (wildcard routing) | [wire tx `0x45fd…34e4`](https://sepolia.etherscan.io/tx/0x45fd1315dedecbca173fc594348982bccff938b5a166a334317c984d2abe34e4) |
| **Tokenized bin subnames** | `bin-01-shibuya`, `bin-02-shibuya`, `bin-01-chiyoda`, `bin-01-shinjuku`, `bin-02-shinjuku` — all `getState → REGISTERED` |

**Hierarchical resolution ✅** — `gomigo.eth` (2LD we own in the ETHRegistry) points
via `setSubregistry` to our own registry, which serves each bin as a subname. This is
the exact ENSv2 flow: *"resolve subnames straight off a parent's registry"* + *"deploy
your own subname registry to tokenize and manage subnames under your own rules."*

**Enhanced Access Control — scoped delegation, proven live ✅.** EAC role bitmaps are
nybble-aligned (`ROLE_SET_RESOLVER = 1<<24`, `ROLE_REGISTRAR = 1<<0`, admin variants
`+128`). We `grantRoles` a **host** address exactly one right on its bin, and the app
reads it back live:

```
hasRoles(bin-01-shibuya, ROLE_SET_RESOLVER, host) → true   ✓ delegated
hasRoles(bin-01-shibuya, ROLE_REGISTRAR,   host) → false  ✓ NOT blanket access
```

That is the track's headline — *"delegate specific rights, like letting an account
edit only certain records"* — demonstrated on-chain, not asserted. GomiGo's
three-sided marketplace maps onto scoped roles: **HOST_OPERATOR**, **COLLECTOR**
(constrained — reset status only), **DISPOSER** (read-only).

**Honest scope note.** Operational text records (`bin-status`, `capacity`, …) are
app-managed: wiring them as on-chain records needs a Permissioned Resolver whose
`initialize` signature isn't documented in the ENSv2 beta yet. The ENSv2 substance
we run on-chain — owning the 2LD, our own subname registry, hierarchical wiring,
tokenized subnames, and live EAC scoped-role delegation — is all verifiable on
Sepolia.

**Reproduce:** `1-deploy-registry` → `4-seed-bins`/`5-finish` → `8-register-gomigo`
(registers `gomigo.eth` + wires the subregistry) in [scripts/ens/](scripts/ens/)
(needs a funded `DEPLOYER_PRIVATE_KEY` in `.env.local`). New bins also register live
on-chain from the **Host → List a bin** flow via [app/api/ens/register](app/api/ens/register/route.ts),
and you can verify the whole deployment any time with `node scripts/ens/verify.mjs`.

---

## Architecture

```
app/
  page.tsx                     Landing (problem → solution → role picker)
  disposer/page.tsx            Map + nearby (geolocation)
  bin/[id]/page.tsx            Bin detail (records, earnings, reviews, verify)
  pass/page.tsx                Active access pass (PIN, countdown, confetti)
  host/page.tsx                Host dashboard (earnings, EAC roles, status writes)
  host/new/page.tsx            List-a-bin (mint subname + records)
  collector/page.tsx           Collector gigs (empty bins, constrained ENS write)
  profile/page.tsx             Disposer profile (level, streak, impact, history)
  api/dropoff/verify/route.ts  World ID v2 verify + ward-scoped rate limit + PIN
components/
  AppShell, DropoffModal, GomiKun (mascot), Chunky, BinCard, ConfettiBurst, ui
lib/
  ensv2.ts   ENSv2 subname resolver, text records, 3 EAC scoped roles (viem)
  data.ts    Seed bins, economics, profile, geo helpers
  store.tsx  In-memory app store (React context) — bins, profile, pass, economy
  utils.ts   cn() + hash truncation
```

**Data note:** the marketplace state (bins, earnings, points, reviews, collector
jobs) is an in-memory React store — it lives for the browser session and resets on
refresh. No backend, safe for a live demo. World ID verification + the ward-scoped
rate limit run server-side in the API route.

## Design system

Arcade / comic take on a Japanese civic palette: chunky black borders, hard offset
shadows, a trash-can mascot (**Gomi-kun**), spring animations and confetti.

| Token | Hex | Use |
| --- | --- | --- |
| Canvas | `#F6F6F6` | Background |
| Ink | `#212121` | Text / borders / CTA |
| Slate | `#263850` | Dark panels (ENS records) |
| Lime | `#E4F843` | Primary pop — pins, pass card |
| Muted | `#637F94` | ENS labels, subtitles |
| Pink / Sky / Grape / Tangerine | accents | Disposer / Collector / Host / warnings |

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · `@worldcoin/idkit` · `viem` ·
`lucide-react` · Baloo 2 + M PLUS Rounded 1c.
