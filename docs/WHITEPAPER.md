# bitchan: A Censorship-Resistant Social Republic on Ethereum

**White paper — v0.1 (draft)**

## Abstract

Social platforms fail in two directions. Centralized ones are *captured*: a single
owner can delete speech, shadowban silently, and rewrite the rules overnight, with no
accountability to the people who live there. The decentralized alternatives fix the
*infrastructure* but punt on *governance* — moderation devolves to whoever runs a
relay, a client, or a labeler, or to no one at all. bitchan takes a third path: a
**self-governing on-chain republic.** Its one commandment: **no post can ever be
erased** — speech may be *hidden*, never *deleted*. Its wedge, which no other platform
has: **moderation answers to a government the citizens elect and can recall** — not a
company, not fragmented relay operators, not no one. And the system is engineered so
that **no actor — not even a malicious president — can destroy it**, because the
destructive levers do not exist in the non-upgradeable core. This paper describes the
architecture, the constitution, the sybil-economics, and the threat model.

## 1. The problem: capture vs. anarchy

Every social platform must answer one question: *who governs the commons?* The
mainstream answer is a corporation — and corporations get captured, sold, or
radicalized by a single owner. The crypto-native reflex is to remove the governor
entirely. But an ungoverned commons is not free; it is a tragedy of spam, abuse, and
illegal content with no one accountable to address it. Regulatory capture and an
ungoverned "Mad Max" are both failure modes.

The unsolved problem is not *hosting* — it is **governing moderation legitimately**:
deciding what the default experience shows, who decides, and how they are held to
account, *without* a dictator and *without* anarchy. That is a constitutional problem,
and bitchan treats it as one.

## 2. Prior art

| Project | Content | Governance of moderation |
|---|---|---|
| **X · Meta · TikTok** *(centralized)* | private servers (off-chain) | company-appointed mods + opaque ranking; no user say, no recall |
| **Farcaster** | off-chain (hubs); on-chain *identity* only | per-client; no elected commons |
| **Nostr** | off-chain (relays); keypair identity | per-relay/per-client; no commons |
| **Lens** | mostly on-chain (+ Momoka DA) | protocol DAO; not moderation-of-feed |
| **Bluesky / AT** | federated servers (not a chain) | composable labelers; company runs the app |
| **DeSo** | bespoke L1 | node + app level |
| **Reddit** *(centralized)* | private servers | volunteer mods, **self-appointed** via succession; paid admins above |
| **bitchan** | **posts on Ethereum L1** + Arweave media | **elected, on-chain, recallable government** |

The column that matters is the last one. Centralized platforms appoint moderators by
fiat — and even Reddit's "community" mods are self-appointed through succession, never
elected by the community they police. Decentralized platforms abolish moderation
*governance* altogether (pick a relay, a client, a labeler). **No social network —
centralized or decentralized — has ever made its moderators answer to a government the
users elect and can recall.** That empty quadrant is bitchan's wedge: a constitutional
government of the commons, atop a substrate *more* on-chain than Farcaster's. (We elect
the government that appoints moderators rather than electing each moderator directly —
a deliberate single accountability chain — but every individual moderation act is
contestable by any citizen before the judiciary.)

## 3. Architecture

**Immutable substrate.** Posts and replies are written to Ethereum L1 (as events);
media and long-form content live on **Arweave** (pay-once, permanent), with only the
content hash anchored on-chain. Nothing can be deleted or edited — *moderation is a
flag, never a grave.* Storing images on-chain is economically absurd ($16–186 each);
the hash-on-chain + Arweave pattern is both cheaper and the correct legal posture
(nodes hold opaque hashes, not media).

**Gasless engagement.** Likes, reposts, and follows are **EIP-712 signed messages** —
no transaction, no gas, no wallet-popup cost — verified and stored by a small
off-chain service. This mirrors Farcaster's signed-message model: the chain carries
durable speech; the cheap, high-frequency social layer is off-chain but cryptographically
authentic.

**Dumb primitives on-chain, smart brains off-chain.** Because the core is
non-upgradeable, a bug in it is unfixable — so the on-chain code stays minimal and
boring (posts, roles, the franchise predicate, the treasury, the founder transition).
Anything clever — reputation scoring, sybil-detection, ranking, dispute deliberation —
runs off-chain where it is fixable, and may only *recommend*; it never unilaterally
executes a consequential on-chain action.

**The fork right.** Anyone may run a frontend that ignores any or all moderation and
reads the same chain. The default experience is governed; the substrate is not. This
is the ultimate backstop against capture: you cannot destroy a credibly-neutral
substrate, only the default UI on top of it.

**Stack.** Solidity 0.8.30 + Foundry; Ponder indexer (chain → GraphQL); a Bun
engagement server; Vite + React frontend. **Ethereum L1 only — no L2**, because an L2
sequencer is a single point of censorship that would undercut the entire thesis.

## 4. The constitution: a governed commons

bitchan is governed by a written [constitution](CONSTITUTION.md) with three tiers of
permanence: **Immutable** (binds forever, even a unanimous vote), **Governable**
(citizen supermajority + timelock), and **Operational** (executive, within hard caps).

- **Bill of Rights (immutable):** no erasure; the right to fork; freedom of conscience
  and opinion (moderation reaches conduct, never viewpoint); and an *un-removable
  leash* — the checks themselves can never be repealed.
- **The Executive:** an elected President appoints Custodians ("jannies"). Powers are
  bounded: `hide` (reversible, logged, on enumerated grounds, never viewpoint) and a
  rate-limited, auto-expiring `do-not-serve` for illegal content. The President has **no
  discretionary control of the purse** and cannot change the rules that empower the
  President.
- **Elections:** a default one-year term (Governable within a 1–2 year hard-capped
  band), held the last two weeks of the year, inauguration January 1. Runway comes from
  **re-election**, not long terms — the internet moves faster than nation-states.
- **The Treasury:** funded by post fees; the President draws only a fixed stipend; the
  treasury can never be drained faster than a hard rate-limit; every disbursement is
  published on an immutable on-chain ledger.
- **The Judiciary:** every consequential act — a hide, a do-not-serve, a slash, an
  election result — is **contestable** by any citizen before an independent body that
  can **void** it. A power without a forum to contest it is not a constitution.
- **The Founding (Washington model):** at genesis the deployer is interim president,
  *more* limited than an elected one (no treasury access; cannot throttle growth).
  Transition to elections is **code-enforced and irreversible** at a citizen-count
  threshold — abdication guaranteed by the machine, not the founder's virtue.

This charter was **ratified by a convention of the 42 Framers of the U.S.
Constitution** (21 ratify, 21 ratify-with-amendments, 0 refuse — including the three
who refused the original in 1787). Their amendments — chiefly the judiciary, the
treasury's open books, and closing a circular check — are incorporated. See the
[Convention record](CONVENTION.md).

## 5. Sybil-economics: skin earned, not bought

The republic's survival rests on one rule: **voting power is per-citizen, never
per-token.** You cannot *buy* the franchise — there is no coin-weighted voting, so no
plutocracy. This is a deliberate break from the dominant on-chain governance model — the
**token-weighted DAO** (Nouns, Compound, most "governance tokens"), where 1 token = 1
vote, so a whale, an exchange, or a leveraged treasury raid simply *buys* the outcome.
That is the very capture bitchan exists to prevent; we refuse coin-weighting outright.
The only attack left is sybil (manufacturing fake citizens), and the
defense is to make the **stake be time and reputation, not money:**

- **Citizenship** = a wallet + a minimum **account age** + a (rate-limited) one-time
  cost **or a free invite**. Posting is open to all; *voting* is gated.
- **Skin is earned, not bought.** A whale can pay ten thousand fees; he cannot fake ten
  thousand accounts that have aged and behaved like humans for months. This is
  landowner-suffrage reframed: the "land" is **homesteaded by presence, not purchased
  with capital.**
- **Capture cost** scales with the *aging* of a fake cohort, not its price — the wall
  is time, which no amount of money shortcuts. Bad-actor invite chains are **slashed.**

## 6. Threat model & failure modes

The central question: *what can a maximally-malicious president do?* By construction,
almost nothing permanent:

- **Cannot delete or edit** any post (immutable substrate).
- **Cannot drain the treasury** (hard rate-limit; open books; no founding-period access).
- **Cannot entrench** (code-enforced term limit + hard-capped term band; recall).
- **Cannot mass-censor** (rate-limited `do-not-serve`, auto-expiring, contestable).
- **Cannot set fees** to price out speech (fee is Governable, not executive).
- **Cannot rewrite the rules** that bind the President (immutable tier; non-upgradeable
  core).

What they *can* do is bounded, reversible, contestable, and recallable. The worst case
is a bad year, not a destroyed republic — and three backstops catch even that:
**recall** (eject early), **the judiciary** (void specific acts), and **the fork**
(if governance itself is captured, the community runs a frontend that ignores it).

Honest residual risks: illegal content is permanent on the substrate (addressed at the
operator/frontend layer via do-not-serve, not protocol deletion); the off-chain layer
is trusted to *recommend* but never to *execute*; and a small early electorate is more
capturable (mitigated by the account-age wall, recall, and the fork). The republic does
not claim to be perfect — it claims to be **un-destroyable.**

## 7. Status & roadmap

- **Built (M0–M2):** the monorepo, the `Bitchan` contract + tests, the Ponder indexer,
  the gasless engagement server, and a mobile-first React frontend — posts, replies,
  gasless likes/reposts/follows, timelines, search, profiles. Verified end-to-end.
- **Designed & ratified:** the constitution (this paper's governance section), passed by
  the full 42-framer convention.
- **Next (M3–M4):** the governance contracts — roles, moderation, citizenship registry,
  treasury, the founder transition, and the right-of-contest — built to the ratified
  spec, with the immutable bounds enforced in the non-upgradeable core.

## Conclusion

bitchan is the internet's town square rebuilt so that its rules and its rulers are
chosen by its citizens and **ungovernable by any tyrant** — because the checks are
enforced by code, not by virtue. Speech that cannot be erased; a government that can be
fired; and a substrate anyone can fork. A republic, if you can keep it — and one built
so that keeping it does not depend on the goodness of whoever holds the keys.
