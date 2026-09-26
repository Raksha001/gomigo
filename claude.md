You are a senior full-stack Web3 developer building a hackathon prototype named **GomiGo** for ETHGlobal Tokyo. We have under 20 hours remaining.

Build a complete, working Next.js (App Router, TypeScript, Tailwind CSS, Lucide icons) mobile-responsive web application that solves Tokyo's public trash shortage by unlocking locked private commercial dumpsters and apartment waste rooms using 2 sponsors:
1. **World ID (Best Use of IDKit - $5,000 track)**
2. **ENSv2 on Sepolia ($6,000 track)**

---

### Core Concept & Problem Solved
- **The Problem:** Tokyo streets have almost no public trash cans. Convenience stores, izakayas, and apartment mansions have dumpsters locked with padlocks or keypads behind back gates to prevent illegal dumping (*fuhō-tōki*). Foreign tourists carrying bento boxes and PET bottles have nowhere to throw them away.
- **The Solution:** 
  - Host commercial bins and residential waste rooms are indexed as hierarchical subnames on **ENSv2 Sepolia** (`bin-01.shibuya.gomigo.eth`).
  - Commuters and tourists unlock 10-minute dynamic PINs to open physical smart padlocks by proving humanity using **World IDKit** (NFC Passport / Device credential).
  - Scoped actions prevent spam dumping with a 1-pass-per-ward-per-day rate limit, while letting users legitimately unlock another bin later in a different ward.

---

### Visual Design System (Strict Requirement)
Adopt a Japanese civic utility / environmental transit dashboard aesthetic (inspired by clean air-quality monitors):
1. **Palette (Configure in Tailwind):**
   - Canvas: `#F6F6F6` (Matte off-white app background)
   - Dark/Text/CTA: `#212121` (Solid primary black)
   - Slate Navy: `#263850` (Map containers, dark metric panels)
   - Electric Lime: `#E4F843` (Map pin nodes, active badges, and the verified access pass card)
   - Muted Slate: `#637F94` (ENS labels, subtitles, secondary chips)
   - Cards: `#FFFFFF` (Pure white containers with rounded-3xl corners)
2. **Container:**
   - Centered smartphone viewport frame (`max-w-md mx-auto min-h-screen bg-[#F6F6F6] shadow-2xl flex flex-col p-4 sm:p-6 sm:rounded-[40px] border border-gray-300`).

---

### Sponsor Implementations & Technical Requirements

#### 1. World ID Integration (`@worldcoin/idkit`)
- In `components/DropoffModal.tsx` & `app/page.tsx`:
  - Mount `IDKitWidget` configured for `action: "dropoff-shibuya"`, `verification_level: "device"` (allows NFC Passport credentials without an Orb).
  - On proof generation, send proof payload to `POST /api/dropoff/verify`.
- In `app/api/dropoff/verify/route.ts`:
  - Verify proof against World's developer API (`https://developer.worldcoin.org/api/v2/verify/{app_id}`).
  - Maintain an in-memory `Set` of nullifier hashes to enforce ward-level Sybil limits.
  - **MANDATORY RUBRIC CRITERIA (Failure & Alternative Paths):**
    - Success: Return HTTP 200 with dynamic 4-digit PIN (e.g., `#8492`), 10-minute countdown, and location directions.
    - Duplicate nullifier within 24h: Return HTTP 429 with explicit rejection message: `"Daily quota exceeded for Shibuya Ward. Gate PIN generation suppressed."`
    - Cancelled / Invalid proof: Return HTTP 400 with visible error alert.

#### 2. ENSv2 on Sepolia Integration (`viem`)
- In `lib/ensv2.ts`:
  - Write helper functions using `viem` to resolve hierarchical subnames on Sepolia:
    - `bin-01.shibuya.gomigo.eth` (Cafe Mon Izakaya Dumpster)
    - `bin-02.shibuya.gomigo.eth` (Mansion Shibuya South)
    - `bin-01.chiyoda.gomigo.eth` (Akihabara Station Hub)
  - Read/Write ENS text records: `bin-status` (AVAILABLE | FULL), `capacity`, `hours`, and `accepted-types` (🍱 Combustibles, 🥤 PET).
  - Emphasize **ENSv2 Enhanced Access Control (Scoped Roles)**:
    - The registered host address has permission to write and update `bin-status` and `capacity`.
    - Disposers have read-only resolution permissions.
  - Include fallback mock records if testnet RPC latency is high, but write full real `viem` contract interaction methods.

---

### UI Screen Structure (`app/page.tsx`)
Create a single-page app with a floating pill-bar switcher:

1. **Header:**
   - Pill status: `GOMIGO 芥` • `📍 Shibuya, Tokyo` • Badge: `ENSv2 Sepolia`.
2. **Navigation Tabs:**
   - `[ Disposer (Tourist Map) ]` and `[ Host Console ]`
3. **Tab 1: Disposer View:**
   - **Dark Slate Map Card (`bg-[#263850]`):** Styled vector map with glowing `#E4F843` node pins indicating bin locations in Shibuya.
   - **Resolved Bin Info Card (`bg-white rounded-3xl p-5 shadow-xs`):**
     - Subname: `🏷️ bin-01.shibuya.gomigo.eth`
     - Metric Chips: Capacity (`78%`), Access Window (`08:00–22:00`), Quota (`1 / Ward / Day`).
   - **The Verification Area:**
     - **Default State:** Black CTA: `"Verify with Passport / World ID"`.
     - **Success State (Electric Lime Card `#E4F843`):** Large monospace PIN `#8492`, 10-minute countdown timer, gate instructions: *"Punch PIN on smart padlock behind Lawson alley. Combustibles & PET only."*
     - **Rejection State (Red Alert Box):** Clear error explaining duplicate nullifier block.
   - **Hackathon Judge Simulation Controls:**
     - Button: `[⚡ Simulate World ID Success]`
     - Button: `[🚫 Simulate Duplicate Nullifier (Failure Path)]`
4. **Tab 2: Host Console:**
   - Toggle switch for host to set bin from `AVAILABLE` to `FULL` (triggers ENS text record write).
   - Feed of verified drop-offs showing truncated nullifier hashes (`0x8f2a...c391`) and timestamps.

---

### Deliverables Needed
1. `tailwind.config.ts` configured with custom colors (`#F6F6F6`, `#212121`, `#263850`, `#E4F843`, `#637F94`).
2. `package.json` with all dependencies (`@worldcoin/idkit`, `viem`, `lucide-react`, `clsx`, `tailwind-merge`).
3. `app/api/dropoff/verify/route.ts` (World ID v2 API verification, in-memory cache, 429 rejection).
4. `lib/ensv2.ts` (ENSv2 text record resolver and scoped access control roles via viem).
5. `app/page.tsx` (Complete mobile UI matching the Takumi / Air Quality aesthetic with judge controls).
6. `README.md` containing the required hackathon debrief:
   - `## World ID Integration Debrief` (Time to first success, friction points, minimum sufficient assurance rationale with passport credentials, and failure path architecture).
   - `## ENSv2 Hierarchical Setup` (Subnames breakdown, Enhanced Access Control explanation, and Sepolia deployment notes).

Ensure all code is production-ready TypeScript with zero placeholders. Let's write the code now.