# The Constitution of bitchan

*v3 — ratified by the full 42-delegate convention (21 RATIFY · 21 RATIFY-WITH-
AMENDMENTS · 0 REFUSE), with the second-round amendment package incorporated.
A charter for an on-chain social republic. Ratification record: [CONVENTION.md](CONVENTION.md).*

> **Preamble.** We establish bitchan as a censorship-resistant town square whose
> speech no party may erase and whose governors are chosen by, and accountable to,
> its citizens. The chain is the commons; the government is hired help, leashed by
> this document; and the people retain, always, the right to read, to fork, and to
> walk away.

> **The One Commandment — *no post can ever be erased.*** Every other rule in this
> charter governs only what may be *hidden* — by whom, on what grounds, and under what
> recall — atop speech that is permanent by construction. Moderation is a curation
> layer answerable to the citizens; it is never a delete key.

**Three tiers of permanence (Article II):** *Immutable* clauses bind forever, even
against a unanimous vote; *Governable* clauses change only by citizen supermajority +
timelock; *Operational* powers act within hard caps. Concrete numbers live in the
[Parameters](#parameters) appendix.

---

## Article I — Bill of Rights *(Immutable)*

1. **No erasure.** No post may be deleted or edited by anyone. Authorship, ordering,
   and timestamps are permanent.
2. **The right to fork.** Anyone may run a frontend that ignores any or all
   moderation and reads the same chain.
3. **Moderation is a flag, never a grave.** The strongest moderation act removes
   content from *honoring frontends*, never from the chain.
4. **Operator conscience & law.** The protocol never deletes, but no operator is
   compelled to serve; any frontend/gateway may decline to serve content to comply
   with law. An operator's right, not a protocol deletion.
5. **The un-removable leash.** The checks in this charter — elections, recall, the
   treasury rate-limit, the founder transition, the right of contest — can never be
   repealed.
6. **Declared rights.** Citizens possess, as inherent and pre-political rights:
   freedom of speech and of the press; the right to read everything on the chain;
   and the right to fork. No officer, no vote, no emergency suspends these.
7. **Freedom of conscience and opinion** *(immutable, raised here from Article III on
   the demand of Mason, Bassett & Carroll)*. No officer — president, custodian, or
   successor — may `hide` or `do-not-serve` content **by reason of the opinion,
   belief, worship, or honest profession it expresses, or because it criticizes the
   moderators.** Moderation reaches conduct injurious to the commons, never viewpoint.
   This liberty lives in the immutable tier — *a right in erasable ink is no right.*

## Article II — Mutability & the Core *(Immutable)*

1. Three tiers: **Immutable** / **Governable** (citizens, supermajority + timelock) /
   **Operational** (president, within hard caps).
2. **The core is non-upgradeable.** No proxy, no admin key. The guarantee is the
   *absence of any function* that could rewrite the bedrock — not a promise.
3. **Minimal core, off-chain brains.** The core stays small and boring; complex,
   evolving logic (reputation, sybil-detection, ranking, dispute deliberation) lives
   off-chain where it is fixable, and may only *recommend* — never unilaterally
   execute a consequential on-chain action. Simplicity in the core is a safety
   requirement.

## Article III — The Executive

1. A **President** (elected, Article IV) appoints and dismisses **Custodians**, who
   serve **at the President's pleasure and never as a co-equal council**. The
   President may never change the rules that empower the President.
2. **`hide`** — President + Custodians; reversible; **logged on-chain with actor and
   reason.** It may issue **only** on enumerated grounds: spam, coordinated
   inauthentic behavior, illegal content, or off-topic flooding *(per Gerry &
   Ingersoll — "injurious" must be defined, not floating)*. It may never reach
   viewpoint (Article I §7). Every `hide` is contestable (Article X).
3. **`do-not-serve`** — President only; rate-limited; reason-logged; reversible;
   **auto-expires** unless re-affirmed by a **citizen supermajority with the
   President excluded** — *not* a custodian quorum, since custodians are the
   President's appointees and cannot check him *(FitzSimons, Clymer, Gilman, Dayton,
   Baldwin, Randolph)*. Initial issuance is contestable (Article X).
4. **The post fee is NOT set by the President.** The fee schedule is **Governable**
   within an immutable **floor** and an immutable **rate-limit on increases** — not a
   fixed-ETH ceiling (the staking-trap lesson). No discretionary lever over the purse.

## Article IV — Elections

1. **Term: default one year, Governable within an immutable band [1-year floor → 2-year
   hard cap].** **Re-election is permitted** — a president who is *proving a model*
   earns runway by being re-elected, not by a longer single term (the term is the
   accountability cycle, not a tenure cap). The hard cap forecloses president-for-life;
   the 1-year floor keeps accountability brisk — *the internet moves faster than
   nation-states.* Adjusting within the band is itself a Governable amendment
   (supermajority + timelock).
2. **The annual election occupies the last two weeks of the year:** week 1
   nominations (by posting on the board); week 2 voting; **inauguration January 1.**
3. Eligibility per Article VII. The **account-age requirement** must always exceed the
   election window by a sybil-defeating margin (immutable floor, [Parameters](#parameters)).
4. **Campaigning happens on the board** — no privileged channel.

## Article V — Removal & Oversight

1. **Two-step recall.** A petition by **20%** of eligible citizens triggers a recall
   vote; removal requires a **two-thirds supermajority** of votes cast **with a 25%
   turnout quorum** *(written here in the text, per McHenry, not only in Parameters)*.
   **Anti-suppression valve** *(Gerry)*: if a petition reaches **60% of all eligible
   citizens**, the removal vote proceeds with **no turnout quorum** — an entrenched
   incumbent cannot defeat a clear majority by depressing turnout.
2. **The Senate is deferred; its powers are not.** A second elected chamber
   (impeachment + treasury oversight) is constituted at a citizen-count threshold
   ([Parameters](#parameters)). Until then those powers — and `do-not-serve`
   re-affirmation — are exercised by **direct citizen supermajority**, bound by an
   explicit **quorum, supermajority fraction, denominator (eligible citizens at
   vote-open), and a close-by deadline** ([Parameters](#parameters)), so no thin
   faction can act in a sleepy vote *(Gorham, Broom, Gilman, Ingersoll)*.

## Article VI — The Treasury

1. Post fees accrue to an on-chain treasury.
2. The President draws a **stipend fixed by rule**, never a discretionary share; the
   treasury can never be drained faster than an **immutable maximum rate**.
3. Disbursements above the stipend require **governance approval** (supermajority +
   timelock; the Senate once it exists).
4. **Open books** *(Morris, FitzSimons, Mifflin)*. Every treasury inflow and
   disbursement — amount, recipient, authorizing vote — is **published on-chain as an
   immutable requirement**, readable by any citizen without permission. A standing
   panel of **sortition-selected citizen-auditors** (no executive officer eligible)
   may inspect and publish findings.
5. During the **Founding Period** the founder draws **no stipend and makes no
   withdrawals.**

## Article VII — Citizenship & Sybil Resistance

1. **Voting power is per-citizen, never per-token.** The republic cannot be bought.
2. **Citizenship** = wallet + **account age** + a **rate-limited one-time cost OR a
   free invite**. Posting is open to all; *voting* is gated. There is **always an
   open, unsponsored path** — never invite-only.
3. **One citizen, one vote**, sybil-resisted by age + cost + an **invite graph**
   (inviters vouch; provably bad-actor chains are **slashed**). A **slash** that
   removes a citizen's franchise requires confirmation by citizen supermajority (or
   the independent body of Article X), with **notice and an opportunity to contest** —
   never a custodian's unilateral hand *(Mason, Carroll, Langdon, Dayton)*.
4. The **account-age minimum** is immutable-floored above the election window
   ([Parameters](#parameters)); Governable upward toward one year.
5. **Skin is earned, not bought.** The stake is time + reputation; money is only the
   fallback. Reputation — earned by tenure and standing in the honest invite graph,
   never by likes/engagement — reduces or waives the cost; lurkers and drive-bys pay
   full. Landowner-suffrage reframed: the "land" is **homesteaded, not purchased.**
6. **The on-chain franchise rule is a dumb, objective predicate**
   (`isCitizen AND accountAge ≥ threshold`); reputation/sybil-scoring runs off-chain
   and may only *recommend*. Any off-chain system that touches eligibility must be
   named, published, and its outputs contestable (Article X). Franchise parameters are
   Governable but bounded by immutable floors + rate-limits — the **free invite path
   is the release valve**, so price can never silently lock out ordinary citizens.

## Article VIII — Amendments

1. **Governable** clauses change only by citizen supermajority + a long timelock.
2. **Immutable** clauses (Articles I, II, the leash, the founder transition, the right
   of contest, and the bounds named immutable) can never be amended.

## Article IX — Founding & Transition *(the Washington model)*

1. At genesis the **deployer is the interim Founding President** — and is *more*
   limited, not less, this being the most dangerous window (no electorate yet).
2. The Founding President: **no treasury access** (no stipend, no withdrawals); may
   **not restrict registration or raise the citizenship cost**; and the
   `do-not-serve` power is bounded by the same rate-limit, logging, and 30-day expiry
   as an elected president, and **suspended** until citizens exist to confirm it
   *(Bassett, Gerry)*.
3. **Transition is code-enforced and irreversible**, driven by a **named on-chain
   citizen registry** *(Mifflin, McHenry)* — when confirmed citizen-count reaches **T**
   ([Parameters](#parameters)), founding powers switch off and the first election
   begins. Only citizens whose citizenship the on-chain predicate has **confirmed**
   are counted, so the handover lands on a clean roll.
4. **The first election is a special election** (the two-week window) on reaching T;
   the first president serves the stub term to the next December 31, then the annual
   cycle governs.
5. **Backstops against a stalled/slow-walked founding:** a **2-year long-stop** (the
   first election runs regardless), **and** once citizen-count reaches **half of T**,
   a citizen supermajority **petition may trigger the first election early** *(Baldwin)*
   — the people hold the accelerant, not the founder's calendar.
6. The founder **may abdicate early** but may **never delay**. Leave early; never stay
   late. After transition the founder holds no founder-powers and no incumbency
   advantage.

## Article X — The Judiciary (Right of Contest) *(the convention's chief demand)*

1. Every consequential act of an officer — a `hide`, a `do-not-serve`, a `slash`, or a
   declared election/recall result — is **contestable** by any citizen.
2. A contest is a **dumb on-chain action** (`contest(actionId)`) that triggers review
   by an **independent body** — a citizen supermajority until the Senate exists, the
   Senate thereafter — which may **void** the act. Its finding is **not revisable** by
   the President or Custodians.
3. The **deliberation lives off-chain**; the chain records only the contest and the
   verdict. No elaborate court — a challenge, a vote, a void, all logged.
4. A power without a forum to contest it is an aspiration, not a constitution
   *(Blair, Ingersoll, Livingston, McHenry, Carroll, Mason, Randolph)*.

---

## Parameters

Ratified 2026-05-24. Governable values are bounded by immutable **floors** + an
immutable **rate-limit on increases** (never fixed-ETH ceilings). The free invite
path is the release valve, so money is never the gate.

| Parameter | Tier | Value |
|---|---|---|
| Post fee | Governable | **0.0001 ETH** start · immutable floor **0.00001 ETH** · increases **≤2×/yr** (no hard ceiling) |
| Citizenship cost (money path) | Governable | **~0.003 ETH** start · increases **≤2×/yr** (immutable rate-limit) · **always bypassable by free invite** |
| Account-age to vote | Governable | **60 days** start & **immutable floor** · ratchets toward **1 year** by vote |
| Recall petition / removal | Immutable | **20%** petition · **2/3** of votes cast · **25%** turnout quorum |
| Recall anti-suppression valve | Immutable | **60%** of all eligible petition → removal vote with **no quorum** |
| Interim (pre-Senate) Senate-power votes | Immutable | **25%** quorum · **2/3** · denominator = eligible citizens at vote-open · **30-day** close deadline |
| Term length | Governable (immutable band) | default **1 year** · band **[1yr floor → 2yr hard cap]** · **re-election allowed** |
| Election window | Immutable | **last 2 weeks of the year; inauguration Jan 1** |
| `do-not-serve` limits | Immutable | **≤10/day** · **30-day** auto-expiry · re-affirmed only by **citizen supermajority (President excluded)** |
| Treasury stipend / drain rate | stipend Gov · rate Immutable | **0** at genesis · drain **≤10% of balance / 7 days** · **open on-chain ledger (immutable)** |
| Founding transition **T** | Immutable | **1,000 confirmed citizens** |
| Early-election citizen trigger | Immutable | citizen supermajority petition allowed at **≥ T/2 (500)** |
| Founding long-stop | Immutable | **2 years** |
| Senate threshold | Immutable | **10,000 citizens** |

---

*v1 ratified-with-amendments by the 13-member quorum; v2 incorporated those + the
founding/election decisions; **v3 (this) ratified by the full 42 with the second-round
amendment package** (judiciary, custodian-loop closed, quorums in-text, open treasury
books, immutable conscience, contestable slash, 60-day age floor). Record:
[CONVENTION.md](CONVENTION.md).*

*Post-ratification, pre-deployment revision: the presidential term was reopened from
immutable-1yr to a **Governable band [1yr → 2yr], default 1yr**, with **re-election**
as the runway mechanism — adopting the amendment Hamilton and Jenifer pressed at the
convention (rationale: the internet moves faster than nation-states; a brisk
accountability cycle with re-election beats a long single term).*
