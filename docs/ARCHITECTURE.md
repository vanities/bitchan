# bitchan — Architecture & Plan

> An on-chain social republic. The censorship-resistant town square: posts live
> forever on Ethereum (media off-chain), governance is transparent and elected,
> and the feed algorithm is yours to swap. Mobile-first.

**Status:** M0–M4 built. Posts, gasless social, and the full elected-government
layer (roles, moderation, citizenship, treasury, elections, recall, judiciary)
are **deployed live on Sepolia**, backed by **Convex** (cloud read model + a
chain-indexing cron + signature-verifying engagement). `bun run dev` runs the app
against Sepolia. Fresh build — *not* a continuation of the 2020–2023
Truffle/Ropsten repo (that toolchain is dead). See the repo `README.md`.

---

## 1. Thesis

The 4chan board model is largely dead; X/Twitter is the de-facto public square.
bitchan rebuilds that square so that **no single party can delete speech or
shadowban silently**:

- **Immutable** — every post is an on-chain record. The text/ordering/authorship
  are permanent and tamper-evident; media is off-chain and content-addressed by
  its hash (the on-chain `mediaHash`). See §5 for the storage tradeoff.
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
| Account | **Anonymous by default**; optionally claim a **handle** (4chan name / tripcode-style). Profile (avatar/banner/bio/website) off-chain in Convex, set by a signed message |
| Post | Short text + optional media (image/video, up to 4 images as a gallery → Convex) |
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

**On-chain events (no storage; the Convex indexer materializes):**
- `Posted(id, author, contentHash, parentId, quotedId, fee)` — posts + replies
- `Hidden / Unhidden(postId, by, reason)` — moderation

**Gasless, off-chain (NOT on-chain):** likes, reposts and follows are **EIP-712
signed messages** — no transaction, no gas, no per-action wallet cost — verified
in a **Convex Node action** (`verifyTypedData` recovers the signer) and stored in
Convex. A like as an L1 tx would cost gas + a wallet popup every time, which kills
casual engagement. (The contract still has `like()/repost()/follow()` for an
optional on-chain path, but the app uses the gasless Convex path.) This mirrors
Farcaster: on-chain anchor, off-chain signed social.

**Contracts (modular, lean MVP):**
- `Accounts` — handle registry + profile hash + registration
- `Feed` — `post()` (charges fee → treasury, emits `Posted`), `repost()`, `like()`, `follow()`
- `Moderation` — custodian-gated `hide()` (or fold into `Feed` behind AccessControl)
- `Governance` — OZ `Governor` + `TimelockController` + `AccessControl`
- `Treasury` — holds fees, disburses via governance

Media hash = **`sha256(content)` (`bytes32`)**. Flow: frontend uploads bytes to
Convex (NSFW-screened) → the content-addressed `sha256` → submits that hash in
the post tx. (Durable Arweave storage is a planned upgrade — §5, task #28.)

## 5. Off-chain architecture

- **Media — Convex (current):** images, video, multi-image galleries, and
  profile assets are stored in Convex, content-addressed by the same `sha256`
  that goes on-chain as `mediaHash`, **NSFW-screened on upload**, and **deletable**.
  Deletability is deliberate: media you can't take down means permanently hosting
  illegal/CSAM content with no remedy. The uncensorable promise is about
  **speech/text** (on-chain, hide-never-delete); the media *attachment* being
  removable is intentional. (See `CONTENTIONS.md` → Storage.)
- **Arweave — planned (task #28):** for vetted, non-illegal durable media via the
  ArDrive Turbo SDK; the txid fits the on-chain `bytes32`. Deferred until the
  screening pipeline is solid.
- **Convex (`web/convex/`):** the whole off-chain backend, in the cloud.
  - *Indexer cron* — a scheduled action polls the chain (viem `getLogs` for
    `Posted` / `Hidden` / `Unhidden` / `HandleSet`) and materializes the
    `posts` / `accounts` read model; `useQuery` makes the timeline reactive.
  - *Engagement* — a Node action verifies EIP-712 likes/reposts/follows
    (`verifyTypedData`) and stores the toggle; queries serve counts + viewer
    state. (Verification must run in a Node action — the Convex query/mutation
    runtime forbids the dynamic import viem uses.)
  Replaces the old Ponder indexer + Bun engagement server (both removed). Because
  Convex runs in the cloud it can only index a **public** chain, so the app dev
  loop runs against **Sepolia**, not local Anvil.
  - *Media + galleries + profiles* — content-addressed media (and the
    manifest hash for multi-image galleries), served by a Convex HTTP action at
    `/media/<hash>`; profile bio/banner/website set via signed actions.
  - *Link previews* — a Vercel serverless function injects per-route OG tags for
    `/post/:id` and `/@handle`, with a `@vercel/og` image.

## 6. Costs (real numbers)

- **Post (event + fee):** ~25–40k gas → **$0.50–$1.60** at 5–15 gwei
  (ETH ~$3k) + protocol fee. Media upload to Convex is free (no per-item cost).
- **On-chain image (rejected):** $16 (5 KB) to $186 (20 KB) → off-chain instead.
- **Like / follow / repost:** **free** — a gasless EIP-712 signature, no tx.
- Implication: **higher-signal, lower-frequency** posting than X.

## 7. Mobile-first

bitchan is designed mobile-first — the timeline is a phone experience.

- **Responsive UI:** Tailwind CSS, single-column timeline, bottom tab bar
  (The Square / Search / Republic / Notifications / Bookmarks / Citizen) —
  X-mobile layout. Design at 375px first, scale up.
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
| Contracts | Solidity 0.8.30, **Foundry 1.6**. OpenZeppelin v5 (AccessControl / Governor / Timelock) — the full governance layer is built + deployed |
| Media storage | **Convex** — content-addressed (`sha256`), NSFW-screened, deletable. Arweave durable option deferred (#28) |
| Backend | **Convex** (cloud): reactive read model, a chain-indexing cron, and a Node action that verifies gasless EIP-712 likes/reposts/follows |
| Frontend | **Vite 6 + React 18 + TypeScript** SPA, **Tailwind v4** (mobile-first) |
| Web3 | **viem 2 + wagmi 2 + RainbowKit 2** — pinned to v2; RainbowKit has no wagmi-v3 support yet, revisit when it ships |
| Networks | **Sepolia** (the live app + Convex index) → Ethereum L1 mainnet. Local Anvil for contract/Foundry work only. **No L2.** |

## 9. Repo layout (Bun workspaces monorepo)

```
bitchan/
  contracts/   # Foundry: src/ test/ script/
  web/         # Vite + React SPA (mobile-first)
    convex/    # Convex backend: indexer cron + gasless engagement + read model
  docs/
    ARCHITECTURE.md   <- this file
```

## 10. Roadmap

- **M0 — Skeleton.** ✅ *Done.* Foundry + Vite + backend wired via `bun run dev`;
  mobile-responsive shell; RainbowKit wallet connect.
- **M1 — Post.** ✅ *Done.* Text posts, handles, `post()` + fee → treasury, the
  global chronological timeline, **media in Convex** (images, video, up to 4-image
  galleries; NSFW-screened). Arweave durable storage is the planned upgrade (#28).
- **M2 — Social.** ✅ *Done.* Follow graph, Following timeline, replies / nested
  threads, gasless likes / reposts (session key), quote posts.
- **M3 — Governance.** ✅ *Done.* AccessControl roles, custodian hide / moderation,
  the founding-phase president, citizenship registry, rate-limited treasury.
- **M4 — Elections.** ✅ *Done & deployed to Sepolia.* Governor + Timelock (per-citizen
  `_getVotes`), recurring calendar elections + recall + judiciary, voting eligibility.
- **M5 — Polish.** ✅ *Largely done.* Search, notifications + unread count, profiles
  (avatar/banner/bio/website, tabs, pinned post), @mentions, #hashtags + trending,
  bookmarks, viewer-local block/mute, shareable URLs + OG link previews, YouTube/Vimeo
  embeds, infinite scroll. Remaining: an off-chain **For You** ranking (the default
  feed is chronological today) and surfacing recurring elections in the UI (#30).

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
