# bitchan — Architecture & Plan

> An on-chain social republic. The censorship-resistant town square: posts live
> forever on Ethereum + Arweave, governance is transparent and elected, and the
> feed algorithm is yours to swap. Mobile-first.

**Status:** M0 done, M1 mostly done — the skeleton is **built and runs locally**
(Anvil + contract + Ponder + web, one command: `bun run dev`). Fresh build —
*not* a continuation of the 2020–2023 Truffle/Ropsten repo (that toolchain is
dead). See the repo `README.md` for how to run it.

---

## 1. Thesis

The 4chan board model is largely dead; X/Twitter is the de-facto public square.
bitchan rebuilds that square so that **no single party can delete speech or
shadowban silently**:

- **Immutable** — every post is an on-chain record + content on Arweave.
  Permanent, content-addressed, tamper-evident.
- **Transparent governance** — an elected President and deputized Custodians
  moderate in the open. They can *hide*, never *delete*. Every moderation
  action is an on-chain event.
- **Swappable algorithm** — ranking / "For You" is off-chain and pluggable.
  Don't like the default frontend's moderation or feed? Run your own against
  the same chain.
- **Fee-to-post anti-spam** — a small posting fee funds the republic's treasury
  instead of ads or CAPTCHA. Makes the feed higher-signal than X by design.

## 2. Product model (X-style, not boards)

| Concept | bitchan |
|---|---|
| Account | **Anonymous by default**; optionally claim a **handle** (4chan name / tripcode-style). Profile (avatar/bio) on Arweave |
| Post | Short text + optional media (image/video → Arweave) |
| Reply | Post with `parentId` → threaded conversations |
| Repost / Quote | Repost event; quote = post with `quotedId` |
| Like | Like event (counts materialized off-chain) |
| Follow | Follow edge → builds your **Following timeline** |
| Timeline | Following (chronological) for MVP; For You (off-chain ranking) later |
| Topics | Hashtags / soft tags (no hard boards in MVP) |
| Republic | **Single global feed — no boards** (like X). Multi-republic is a possible future, not planned |

**Honest UX constraint:** posting costs **gas + a protocol fee ≈ $0.50–$2**
(see §6). bitchan will never be free-shitpost-cheap like X — and that's the
point (anti-spam, funds the president). Likes / follows / reposts are gas-only
(no protocol fee) to keep engagement frictionless.

## 3. Governance

- **Roles (OZ `AccessControl`):** `PRESIDENT` (`DEFAULT_ADMIN_ROLE`),
  `CUSTODIAN` (moderation). President **deputizes** custodians via
  `grantRole(CUSTODIAN, addr)` / `revokeRole` — on-chain, transparent.
- **Moderation = hide, never delete.** A custodian emits `Hidden(postId, reason)`.
  The default frontend respects it; the post still exists on-chain + Arweave,
  and any alternate frontend can ignore the hide. This *is* the anti-shadowban
  guarantee — moderation is a visible policy, not a memory hole.
- **Elections (OZ `Governor` + `TimelockController`):** periodic presidential
  elections. Voting eligibility gated by account age + registration (sybil
  resistance — carry-over of the original "1 year lurking to vote" idea,
  parameter TBD).
- **Treasury:** post fees accrue to a treasury contract; the Governor (or the
  president, within limits) disburses — president stipend + board upkeep.
- **Sybil resistance:** registration may require an invite code (logarithmic
  cost / invite graph from the original design) so mass fake-account voting is
  expensive.

## 4. On-chain architecture — event-sourced (CQRS)

The key design move: **the chain is an append-only event log of social actions;
the indexer is the read model.** This keeps gas minimal (no on-chain timelines
or counters) while preserving the chain as source of truth for ordering +
authorship.

**Stored on-chain (authoritative state, read by contract logic):**
- Roles (AccessControl), governance proposals / votes, treasury balance, fee params
- Handle registry (handle → address), account registration + timestamp

**On-chain events (no storage; Ponder materializes):**
- `Posted(id, author, contentHash, parentId, quotedId, fee)` — posts + replies
- `Hidden / Unhidden(postId, by, reason)` — moderation

**Gasless, off-chain (NOT on-chain):** likes, reposts and follows are **EIP-712
signed messages** — no transaction, no gas, no per-action wallet cost — verified
and stored by the `server/` package. A like as an L1 tx would cost gas + a wallet
popup every time, which kills casual engagement. (The contract still has
`like()/repost()/follow()` for an optional on-chain path, but the app uses the
gasless server.) This mirrors Farcaster: on-chain anchor, off-chain signed social.

**Contracts (modular, lean MVP):**
- `Accounts` — handle registry + profile hash + registration
- `Feed` — `post()` (charges fee → treasury, emits `Posted`), `repost()`, `like()`, `follow()`
- `Moderation` — custodian-gated `hide()` (or fold into `Feed` behind AccessControl)
- `Governance` — OZ `Governor` + `TimelockController` + `AccessControl`
- `Treasury` — holds fees, disburses via governance

Content hash = **Arweave TXID (`bytes32`)**. Flow: frontend uploads bytes to
Arweave → gets TXID → submits TXID + metadata in the post tx.

## 5. Off-chain architecture

- **Arweave (via Irys / Turbo bundler):** images, video, long-form text,
  profile assets. Pay-once, ~permanent, content-addressed, sub-cent per item.
  Immutable — satisfies the one condition for going off-chain.
- **Ponder indexer (TS):** subscribes to contract events → read model → GraphQL.
  Materializes the timeline + threads from `Posted`; applies hide events. Same
  TS/viem mental model as the frontend.
- **Engagement server (`server/`):** Bun + Hono + `bun:sqlite`. Accepts EIP-712
  signed likes/reposts/follows, verifies the signature recovers to the claimed
  signer (viem `verifyTypedData`), stores the toggle, and serves counts. The
  gasless social layer.
- **Optional IPFS mirror** for fast gateway reads; Arweave is the durable copy.

## 6. Costs (real numbers)

- **Post (event + fee):** ~25–40k gas → **$0.50–$1.60** at 5–15 gwei
  (ETH ~$3k) + protocol fee + sub-cent Arweave upload.
- **On-chain image (rejected):** $16 (5 KB) to $186 (20 KB) → off-chain instead.
- **Like / follow / repost:** **free** — a gasless EIP-712 signature, no tx.
- Implication: **higher-signal, lower-frequency** posting than X.

## 7. Mobile-first

bitchan is designed mobile-first — the timeline is a phone experience.

- **Responsive UI:** Tailwind CSS, single-column timeline, bottom tab bar
  (Home / Search / Notifications / Profile), compose FAB — X-mobile layout.
  Design at 375px first, scale up.
- **PWA:** installable (add-to-home-screen), service worker caches the app shell
  + recent reads for instant loads and offline browsing of cached posts. Web
  Push for notifications (works on installed PWAs, incl. iOS 16.4+).
- **Mobile wallet UX (the hard part):** on mobile there's no browser extension —
  connection happens via **WalletConnect v2 deep links** into wallet apps
  (MetaMask, Rainbow, etc.) or inside a wallet's in-app browser. RainbowKit /
  Reown AppKit handle this; **test the mobile connect + sign flow in week one** —
  it's the #1 source of dapp mobile friction.
- **Optional normie onboarding:** embedded wallets (Privy / Dynamic) let users
  start with email / social and no wallet app. Adds third-party trust — keep out
  of MVP, revisit for growth.
- **Native later:** PWA first; React Native only if the PWA hits real limits.

## 8. Stack (locked)

| Layer | Choice |
|---|---|
| Monorepo | **Bun** workspaces (≥ 1.3) — runtime + package manager |
| Contracts | Solidity 0.8.30, **Foundry 1.6**. OpenZeppelin v5 (AccessControl / Governor / Timelock) lands at **M3** — M0/M1 uses a minimal `president` |
| Permanent storage | Arweave via Irys / Turbo SDK (planned — M1; today media is a hash placeholder) |
| Indexer | **Ponder 0.16** (TS → GraphQL / SQL); CORS-enabled for the SPA |
| Engagement | **`server/`** — Bun + Hono + `bun:sqlite` + viem; gasless EIP-712 likes/reposts/follows |
| Frontend | **Vite 6 + React 18 + TypeScript** SPA, **Tailwind v4** (mobile-first) |
| Web3 | **viem 2 + wagmi 2 + RainbowKit 2** — pinned to v2; RainbowKit has no wagmi-v3 support yet, revisit when it ships |
| Networks | **Local Anvil (dev)** → Sepolia (testnet) → Ethereum L1 mainnet. **No L2.** |

## 9. Repo layout (Bun workspaces monorepo)

```
bitchan/
  contracts/   # Foundry: src/ test/ script/
  indexer/     # Ponder (chain events -> GraphQL)
  server/      # gasless engagement (signed likes/reposts/follows)
  web/         # Vite + React SPA (mobile-first)
  docs/
    ARCHITECTURE.md   <- this file
```

## 10. Roadmap

- **M0 — Skeleton.** ✅ *Done.* Foundry + Vite + Ponder wired together on local
  Anvil via `bun run dev`; mobile-responsive shell; RainbowKit wallet connect.
- **M1 — Post.** 🚧 Done: text posts, handles, `post()` + fee → treasury, the
  global chronological timeline, likes/replies/follows (events + indexer).
  Remaining: real **Arweave upload** for images (the contract already carries a
  media hash; the upload path isn't wired yet).
- **M2 — Social.** Follow graph, Following timeline, replies / threads, likes, reposts.
- **M3 — Governance.** AccessControl roles, custodian hide / moderation, president.
- **M4 — Elections.** Governor + Timelock, voting eligibility, treasury disbursement.
- **M5 — Polish.** Off-chain For You ranking, notifications (web push), search, profiles.

## 11. Open decisions

1. ~~Republic scope~~ — **decided: single global feed, no boards** (like X).
2. ~~Identity~~ — **decided: anonymous by default + optional handle** (4chan
   name / tripcode-style); posting never requires a handle.
3. **Handles:** first-come-free (current impl) vs a small fee / auction to deter
   squatting?
4. **Post fee:** amount + split — currently 0.0001 ETH, all to treasury. Keep, or
   give the president a cut?
5. **Voting eligibility:** account-age threshold and / or invite-graph
   requirement — what values? (Decide at the governance milestone, M4.)
