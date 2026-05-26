# bitchan Governance — Buildable Build Plan (M3/M4)

*The minimal, codeable subset of [CONSTITUTION.md](CONSTITUTION.md) for the M3/M4
build, plus the test strategy, the UI surface, and the backend logic it requires. The
constitution says **why**; this says **what to build**. Concrete numbers come from the
[Parameters table](CONSTITUTION.md#parameters).*

> **Status (built):** Phase 1 + Phase 2 contracts are built, tested (97 Foundry tests),
> and **deployed to Sepolia**; the Republic UI ships citizenship + elections. Remaining:
> indexing governance events into Convex (task #21) and election-cadence automation.

## The governing principle

The core is **non-upgradeable** → a bug in it is **unfixable.** So the on-chain code
must be minimal and boring. Everything clever — reputation, sybil-detection,
invite-graph health, rep-weighted discounts — lives **off-chain** (Convex),
where it's cheap and fixable, and may only *recommend*; the chain executes one-line
actions. **Dumb primitives on-chain, smart brains off-chain** (same pattern as gasless
likes). *Simple is better — this can balloon into something we can't safely code in
Solidity.*

## Phasing — you don't need elections until you near T

- **Phase 1 — Founding Executive + Registry** *(build now)*: roles, moderation,
  citizenship registry, treasury, the founding-phase transition. The founder governs
  until **T = 1,000 citizens**; that's the only governance the site needs at launch.
- **Phase 2 — Elections + Recall + Contest** *(before citizens approach ~1,000)*:
  the per-citizen Governor, the year-end window, recall, the right of contest. Gated
  behind `foundingPhase == false`, so there's no rush.
- **Phase 3 — Senate** *(at ~10,000 citizens)*: the second chamber. Out of scope here.

---

## 1. What the smart contracts look like

Two new contracts on top of today's `Bitchan.sol`, both deliberately boring. Immutable
bounds are `constant` / `immutable`; **the non-upgradeable deployment *is* the
guarantee** — no proxy, no admin key, no function that can rewrite the bedrock.

### `BitchanRegistry` (Phase 1) — roles, citizenship, moderation, treasury, founding

Extends the core. Uses OZ `AccessControl` for roles (audited, boring, and what the
Governor will plug into at Phase 2).

```solidity
// ── Roles ─────────────────────────────────────────────────────────────
bytes32 constant PRESIDENT_ROLE = keccak256("PRESIDENT");
bytes32 constant CUSTODIAN_ROLE = keccak256("CUSTODIAN");
// President grants/revokes CUSTODIAN_ROLE at will — custodians serve at pleasure,
// never a council (Constitution Art. III §1). Representative model: you elect the
// President; the President staffs the mods; you recall the President.

// ── Citizenship registry: the DUMB franchise predicate ───────────────
mapping(address => uint64) public registeredAt;   // first-seen; set on first post
mapping(address => bool)   public isCitizen;
uint256 public citizenCount;                       // confirmed citizens only
uint64  public ageThreshold;                       // 60d start, immutable floor, ratchets ≤1yr

function claimCitizenship() external payable;      // ≥ citizenshipCost → treasury
function redeemInvite(bytes32 code) external;      // FREE path; inviter-minted (release valve)
function canVote(address a) public view returns (bool); // isCitizen && age ≥ ageThreshold
function slash(address a) external;                // governance/contest executor ONLY (off-chain recommends)

// ── Moderation: events the frontend honors; never a delete ───────────
function hide(uint256 postId, string reason) external;        // PRESIDENT or CUSTODIAN; logged
function unhide(uint256 postId) external;
function doNotServe(uint256 postId, string reason) external;  // PRESIDENT only; ≤10/day; 30-day expiry
function reaffirmDoNotServe(uint256 postId) external;         // re-affirmed only by citizen vote, President excluded

// ── Treasury: open books, rate-limited, no founder access ────────────
function withdraw(address to, uint256 amount) external;       // require(!foundingPhase); ≤10% / 7d; >stipend ⇒ governance
// every inflow (post fee, citizenship) and outflow already emits an event → open books

// ── Founding transition: the Washington model (immutable, ONE-WAY) ───
bool    public foundingPhase;          // true at deploy
uint256 public immutable T;            // 1000
uint256 public immutable deployedAt;
uint256 constant LONGSTOP = 730 days;  // 2-year backstop
function pokeTransition() external;     // anyone: sets foundingPhase=false once citizenCount≥T OR now≥deployedAt+LONGSTOP
function abdicate() external;           // founder only; one-way → false. NO function ever sets it true again.
// while founding: withdraw reverts; setCitizenshipCost / registration setters revert
// (the founder cannot throttle the growth that ends their reign).

// ── Right of contest (Art. X) ────────────────────────────────────────
function contest(bytes32 actionId) external;                  // any citizen; emits Contested
function ruleContest(bytes32 actionId, bool voided) external; // independent-body result executor

// ── Governable parameters: each setter checks immutable floor + ≤2×/yr ─
function setPostFee(uint256) external;          // floor 0.00001 ETH
function setCitizenshipCost(uint256) external;  // ~0.003 ETH start; invite path always free
function setAgeThreshold(uint64) external;      // never below 60d floor; ratchets toward 1yr
```

### `BitchanGovernor` + `TimelockController` (Phase 2) — elections, the per-citizen core

OZ `Governor` + `TimelockController`, with **one critical override** — this is the line
between bitchan and a Nouns-style token DAO, enforced in code:

```solidity
// OZ Governor expects an IVotes token (balance = votes). We DO NOT use one.
// Voting power is 1 per eligible citizen at the snapshot, never a token balance:
function _getVotes(address a, uint256 timepoint, bytes memory) internal view override
    returns (uint256)
{
    return (isCitizen[a] && registeredAt[a] + ageThreshold <= timepoint) ? 1 : 0;
}
```

- **Elections** open in the immutable window (last 2 weeks of the year; inauguration
  Jan 1); candidacy = posting on the board; the winner is granted `PRESIDENT_ROLE` via
  the timelock; the first election is the special election triggered at **T** (or the
  long-stop, or a half-T citizen petition).
- **Recall** = a Governor proposal type: **20%** petition → vote; removal needs **⅔** of
  votes cast at **25%** turnout; the **60%-of-eligible** petition bypasses the turnout
  quorum (anti-suppression valve).
- **The Timelock owns the consequential levers** — the treasury and the parameter
  setters. The President proposes; the timelock delays; citizens can see it coming (and
  exit / fork) before anything executes. The President never holds a discretionary key.

**Phase 1 is a few hundred lines of boring Solidity. Phase 2 is mostly stock OZ + one
`_getVotes` override.** Nothing in either is clever.

---

## 2. Tests that don't suck

**Rule: every test asserts a constitutional guarantee or a threat-model claim — never a
getter.** The suite should read like the constitution. Three layers:

### a. Threat-model suite — `MaliciousPresident.t.sol` (the headline)
One test per Whitepaper §6 bullet: a maximally-malicious president *tries* the
destructive act and we assert it's impossible/bounded.
- `test_cannotDeleteAnyPost` — there is no selector that removes a `Posted` record; hide ≠ delete.
- `test_cannotDrainTreasury` — withdraw reverts in founding; capped at ≤10%/7d after.
- `test_cannotEntrench` — term cap + recall hold; cannot extend own term past the band.
- `test_cannotMassCensor` — `doNotServe` reverts past 10/day, auto-expires at 30d, is contestable.
- `test_cannotPriceOutSpeech` — `setPostFee` reverts above the ≤2×/yr rate-limit.
- `test_cannotRewriteTheLeash` — the immutable bounds have no setter (compile-time + selector assertion).

### b. Invariant tests (stateful fuzzing via a bounded `Handler`)
The fuzzer drives random call sequences; these must hold over *all* of them.
- `invariant_foundingPhaseNeverResumes` — once false, never true again.
- `invariant_treasuryDrainRateCapped` — outflow in any rolling 7d ≤ 10% of period-start balance.
- `invariant_voteWeightIsZeroOrOne` — `getVotes(a) ∈ {0,1}` for every account, always (no token path can exceed 1).
- `invariant_citizenCountMatchesRegistry` — `citizenCount` == number of `isCitizen` true.
- `invariant_noFounderTreasuryAccess` — while founding, treasury balance only ever grows.

### c. Fuzz + unit (behavior, with `vm.warp`/`vm.roll` for time)
- `testFuzz_canVote(addr, age)` — true iff citizen AND age ≥ threshold; nothing else grants it.
- `testFuzz_doNotServeRateLimitAndExpiry` — >10/day reverts; lapses at exactly 30d unless reaffirmed.
- `testFuzz_paramSetterBounds` — every setter reverts below floor / above 2×/yr.
- `test_transition_atT`, `test_transition_atLongstop`, `test_transition_halfT_petition`, `test_abdicate_isOneWay`.
- `test_recall_thresholds` and the `test_recall_60pct_noQuorum` valve.
- `test_slash_requiresGovernanceNotCustodian` + notice/contest path.

**Anti-brittleness:** assert *observable behavior and invariants*, not storage slots or
incidental event ordering. Handler-based invariants explore realistic sequences; no
mocking the contract under test. Name each test for the guarantee it proves.

---

## 3. What governance looks like in the UI

A **Republic** surface in the new-federalist design system. Consequential actions use
the red primary; everything is transparent and contestable by construction.

- **Census / dashboard** *(extends today's RepublicPanel)* — citizens, dispatches,
  treasury, sitting president, a **founding-progress bar** (`citizenCount / T`), and a
  countdown to the next election window. This *is* Balaji's on-chain census: legitimacy
  you can audit.
- **Citizenship flow** — "Become a citizen": pay `citizenshipCost` **or** redeem an
  invite; shows your account age, `canVote` status, and your remaining invite codes.
- **Elections** (Phase 2) — candidate list (their campaign posts), a single on-chain
  vote (consequential → a real tx, not gasless), live tally, your vote receipt,
  countdown to inauguration.
- **Recall** — petition progress toward 20% (and the 60% valve), sign-petition action,
  the removal vote when triggered.
- **Treasury ledger** — open books: every inflow/outflow with amount, recipient,
  authorizing vote, plus the rate-limit headroom remaining.
- **Custodian roster** — who holds `CUSTODIAN_ROLE`, with the grant/revoke log.
- **Moderation transparency** — a public log of every `hide` / `do-not-serve` (actor +
  reason + expiry). On a hidden post: *"hidden by @custodian — reason — [view anyway]
  [contest]"*. The **"view anyway"** is the fork right, in the UI.
- **Contest / appeal** — a `contest(actionId)` button on any hide, do-not-serve, slash,
  or election result; a contest queue; the verdict logged.

Design principle: surface the *transparency* as the feature. Every governance act is
visible and challengeable — that's the product, not an admin panel.

---

## 4. What the backend logic needs to be

Same split as everywhere: **the chain executes one-liners; the backend indexes and
recommends.** Extensive structured logging on every handler, route, and on-chain
round-trip (AI-written code is buggy — log the full event → state transition).

### Convex indexer (reactive read model)
Extend the chain-indexing cron to materialize governance state for the UI (see
ARCHITECTURE.md §5 for the backend shape):
- `citizens`, `citizenship` (claims / invites / slashes), `roleGrants` (custodians)
- `moderationActions` (hide / unhide / do-not-serve / reaffirm — actor, reason, expiry)
- `treasuryFlows` (in / out), `elections` (candidacy / votes / result),
  `recalls` (petitions / votes), `contests` (filed / ruled)
- Derived: current president, custodian roster, founding progress, the treasury ledger,
  live tallies, recall progress. Apply `hide`/`do-not-serve` to the timeline read model.
  *(posts + moderation are indexed today; the governance events above are task #21.)*

### Convex engagement + recommenders — the brains that *recommend, never execute*
- Gasless EIP-712 likes/reposts/follows are verified in a Convex Node action. **Voting is
  NOT gasless** — a vote is consequential and must be the citizen's own signed tx with the
  franchise predicate enforced on-chain.
- Off-chain services that **recommend** (a custodian/governance then executes the
  one-liner on-chain): invite-graph / sybil health → `slash` candidates; reputation
  (tenure + honest-graph standing, never likes) → fee/cost discounts (future); contest
  deliberation threads (discussion off-chain, verdict on-chain).
- **Boundary discipline (Art. VII §6 / X):** any off-chain system that touches
  eligibility must be **named, published, and its outputs contestable.** The backend
  never holds a key that unilaterally executes a consequential on-chain action.

---

*Roadmap: Phase 1 contracts + the threat-model test suite first (governance is useful
the day it ships, since the founder governs to T); the Republic UI + indexer governance
schema alongside; Phase 2 Governor/Timelock + elections UI before citizens approach T.*
