# Contentions

A living log of bitchan's unresolved tensions and deliberate tradeoffs — the places
where two things we want pull against each other. Each entry: the **tension**, where
we've landed **for V1**, and the **path forward**. Update as decisions shift.

Two principles we resolve most of these against:
- **The permissionless floor** — every convenience layer sits on an always-available
  permissionless floor (raw chronological feed, pay-your-own-gas, the fork right).
  Evaluate any feature by: *does the floor survive?*
- **Defend with structure, not tedium** — deter bad actors with fees, rate-limits,
  transparency, reversibility, contestability, recall, and no-delete — never by making
  the system annoying to use. Goal: *pleasant to use AND impossible to destroy.*

---

## UX

### Per-action signing friction
**Status:** deferred (post-V1)
**Tension:** every post is an on-chain tx → a wallet signature (+ gas + the anti-spam
fee) each time. Tedious — "posting kind of sucks." But on-chain is exactly what makes
posts uncensorable, which is the point.
**V1 stance:** accept it. Posts are deliberately rare and the fee is intentional, so the
friction sits in the least-bad place. Engagement (like/repost/follow) is already gasless
(off-chain signed).
**Path forward:** account abstraction — EIP-7702 + ERC-4337 session keys + a paymaster
(sponsored gas) → sign once per session, post fluidly, still fully on-chain. Optional
embedded/passkey wallets for normie onboarding. Keep the floor: always able to pay your
own gas directly on L1.

---

## Storage

### Durable media: deletable (Convex) vs permanent (Arweave)
**Status:** settled for V1; Arweave deferred (#28)
**Tension:** the thesis wants permanence, but media you *can't take down* means
permanently hosting illegal/CSAM content with no remedy. Permanence and moderation are
opposites.
**V1 stance:** media lives in **Convex (deletable)** with a server-side NSFW screen on
upload. Deletability is the *responsible* choice for media. The uncensorable promise is
about **speech/text** (on-chain, permanent, hide-never-delete) — intact; the media
*attachment* being removable is intentional.
**Path forward (#28):** Arweave (ArDrive Turbo SDK) for *vetted, non-illegal* durable
media once screening is solid; the txid fits the on-chain `bytes32`. Not Irys (deprecated
SDK; its L1 storage isn't guaranteed-permanent).

### NSFW ≠ CSAM
**Status:** open (revisit at scale)
**Tension:** the upload screen (OpenAI moderation) blocks adult content, but real CSAM
compliance (PhotoDNA / NCMEC) is a heavier, gated system.
**Stance:** NSFW screen + deletability + a report path is the responsible MVP baseline;
full CSAM compliance is a "when there's traffic / legal" item. Don't overclaim.

---

## Governance

### Is the presidency worth fighting for?
**Status:** deferred (post-V1)
**Tension:** the office is deliberately weak (transparent moderation + appoint
custodians). Real social power is the algorithm + monetization — here both are
off-chain/forkable/governance-controlled. Too weak an office may not drive the elections
that are the whole wedge.
**V1 stance:** keep it weak. There's no ranking algorithm to control yet (the feed is
chronological), so "president controls the algorithm" is premature.
**Path forward:** let the president set the **default experience** — default feed
ranking/policy, featured posts, guidelines: control of *what most people see by default*,
the real currency of social — while keeping the floor (raw chronological always served,
forkable, timelocked + contestable + recallable). Ladder: on-chain weights → Arweave
policy doc → Bluesky-style feed-generator registry.

### Election UI not wired
**Status:** open (#30)
**Tension:** the recurring `BitchanElections` is deployed + wired on Sepolia, but the web
`ElectionCard` reads the old single-shot interface, so elections aren't surfaced.
**Stance:** fine for now — nothing runs during founding, and an election only happens in
the December window. Rework the card when it's actually relevant.

### Gasless engagement is sybil-able
**Status:** open
**Tension:** likes/reposts/follows are off-chain signed (free, frictionless) → cheap to
sybil with fake accounts.
**Stance:** acceptable for raw counts; any *ranking* that uses engagement should weight
tenure / honest-graph reputation over raw likes (the off-chain "recommend, never execute"
brain). Ties into the default-feed design above.

---

## Infra / centralization

### Convex is a centralized backend
**Status:** accepted (watch)
**Tension:** the indexer, read-model, engagement, and media all run on Convex (a
centralized cloud service) — in tension with censorship-resistance.
**Stance:** acceptable because the **chain is the source of truth** and the read-model is
*reproducible* — anyone can re-derive the feed/engagement from public chain data, or run
their own backend. Convex is a convenience, not a lock. The one thing actually *stored*
there is media (intentionally deletable).
**Watch:** media + the default ranker are the real Convex dependencies; keep them
reproducible/replaceable so Convex never becomes a chokepoint.

### Dev loop runs on Sepolia, not local Anvil
**Status:** accepted
**Tension:** Convex (cloud) can't index a local Anvil node, so full-stack dev runs against
Sepolia — slower (~30s to see a post), costs testnet gas. Lost the instant local loop.
**Stance:** accepted for simplicity (Convex-only, dev-on-Sepolia). Anvil remains for
Foundry/contract work.

---

## Operations

### Key custody / who is the founder
**Status:** open (before mainnet)
**Tension:** we lost the first deployer/president key and redeployed with a throwaway one
(in `contracts/.env`). For mainnet, "who holds the founder key" is a real custody +
legitimacy question.
**Stance:** fine for testnet. Before mainnet: decide founder key custody (hardware wallet
/ multisig) and the founding-phase president's identity.

---

## Product

### Single global feed, no boards
**Status:** settled
**Tension:** bitchan is one global timeline (like X), not boards/communities (unlike
4chan). Some users may want sub-communities.
**Stance:** single global feed for V1. Multi-republic / boards is a possible future, not
planned.

### Ethereum L1 only, no L2
**Status:** settled
**Tension:** L1 is expensive; an L2 would be cheaper. But an L2 sequencer is a single
censorship point that undercuts the entire thesis.
**Stance:** L1 only. The cost is the price of credible neutrality.
