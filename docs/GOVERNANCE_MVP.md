# bitchan Governance — Buildable MVP Spec

*The minimal, codeable subset of [CONSTITUTION.md](CONSTITUTION.md) for the M3/M4
build. The constitution describes the whole republic; this describes only what to
write in Solidity now.*

## The governing principle

The core is **non-upgradeable** → a bug in it is **unfixable.** So the on-chain code
must be minimal and boring. Everything clever — reputation, sybil-detection,
invite-graph health, rep-weighted discounts — lives **off-chain** (indexer/server),
where it's cheap and fixable, and can only *recommend*; the chain executes one-line
actions. **Dumb primitives on-chain, smart brains off-chain** (same pattern as gasless
likes).

## Phasing — you don't need elections until you near T

- **Phase 1 — Founding Executive + Registry** *(build now)*: roles, moderation,
  citizenship registry, treasury, the founding-phase counter. The founder governs
  until **T = 1,000 citizens**; that's the only governance the site needs at launch.
- **Phase 2 — Elections + Recall** *(build before citizens approach ~1,000)*:
  candidacy/voting/tally, the year-end window, recall. Gated behind
  `foundingPhase == false` anyway, so there's no rush.
- **Phase 3 — Senate** *(at ~10,000 citizens)*: the second chamber.

---

## Phase 1 — the only Solidity to write now

A governance core (extends today's `Bitchan.sol`). All immutable bounds are
`constant`s; the non-upgradeable deployment *is* the guarantee.

### Roles — OZ `AccessControl`
- `PRESIDENT_ROLE` — the deployer at genesis (the Founding President).
- `CUSTODIAN_ROLE` — granted / revoked by the president; serves at the president's
  pleasure, never a council.

### Citizenship registry — the dumb franchise predicate
```
registeredAt[addr]            // set on first interaction (first post auto-registers)
isCitizen[addr]               // set by claimCitizenship() or redeemInvite()
citizenCount                  // ++ on each new citizen
canVote(a) = isCitizen[a] && (block.timestamp - registeredAt[a]) >= ageThreshold
```
- `claimCitizenship()` payable — `require(msg.value >= citizenshipCost)` → treasury.
- `redeemInvite(code)` — free; each citizen mints a small number of codes.
- `slash(addr)` — CUSTODIAN/governance only; revokes citizenship + invite power.
  *(Detection is off-chain; this is the one-line executor.)*

### Moderation — events the frontend honors
- `hide(postId, reason)` / `unhide(postId)` — president **or** custodian; emits
  `Hidden`/`Unhidden` with actor + reason (logged). Never targets opinion/criticism
  (off-chain flagged; the chain only records).
- `doNotServe(postId, reason)` / `reaffirm(postId)` — **president only**;
  `require` ≤ **10/day** (rolling); **auto-expires after 30 days** unless `reaffirm`ed
  by an independent vote (custodian quorum, or — until a Senate — citizen
  supermajority; **president excluded**).

### Treasury
- Fees accrue to the contract.
- `withdraw(to, amount)` — `require(!foundingPhase)`; rate-limited **≤10% of balance
  per 7 days**; above the stipend needs governance approval (Phase 2). During
  founding it reverts entirely.

### Founding phase — the Washington transition (immutable core)
```
bool foundingPhase = true;                 // at deploy
// on each new citizen, and pokeable by anyone:
if (citizenCount >= T /*1000*/ ) foundingPhase = false;
if (block.timestamp >= deployedAt + LONGSTOP /*2y*/) foundingPhase = false;
```
- While `foundingPhase`: president = founder; `withdraw` reverts; the registration
  and citizenship-cost setters revert (the founder **cannot throttle the growth that
  ends their reign**).
- `abdicate()` — founder only; flips `foundingPhase = false` early. **No function can
  ever set it back to true.**

### Parameters — governable storage + immutable bound constants
Each setter checks its immutable floor and the **≤2×/yr** rate-limit. Values in the
[Parameters table](CONSTITUTION.md#parameters).

**Phase 1 is a few hundred lines of boring Solidity.** Nothing in it is clever.

---

## Off-chain (TypeScript — the brains, fixable anytime)
- Reputation, sybil-detection, invite-graph health → *recommends* who to `slash`.
- Rep-weighted fee discounts (future).
- Vote tally + visualization (Phase 2).

## Tests (forge)
Citizenship (pay / invite / age) · `canVote` · transition at T *and* the long-stop ·
founder lockouts (no withdraw, no growth-throttle) · `abdicate` is one-way ·
moderation rate-limit + 30-day expiry · treasury drain-rate cap · `slash`.
