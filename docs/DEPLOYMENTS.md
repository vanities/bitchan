# Deployments

## Sepolia (chain 11155111) — 2026-05-27

Redeploy carrying the security-review fixes: the Governor now snapshots
per-citizen voting power **and** the quorum denominator at the proposal
timepoint (so the citizen rolls can't be edited mid-proposal to freeze or force
a vote), `BitchanElections.finalize` rejects finalizing a stale year over a
newer president, and the deploy scripts refuse the public Anvil key on any
non-local chain. Founding phase. Founder / interim president = the deployer
`0xc1b873fceEDE52662c9F2b352F811652aA2319e3` (the `DEPLOYER_PK` repo secret —
confirm/rotate before mainnet). Supersedes the 2026-05-26 deploy at
`0x53Fe…ebd`, whose indexed data was cleared via `convex run admin:reset`.

| Contract | Address |
|---|---|
| `BitchanRepublic` | `0xE74dCFa376ca6B31a1697031d89857d58cBf4bD9` |
| `BitchanElections` | `0x47B79bEe2A97F863fa6B8377272688a6f9e80E1f` |
| `BitchanGovernor` | `0xb04C95142bF8237d97a5702A07c9a9264a438834` |
| `BitchanJudiciary` | `0x3DcF0cC1F8ec1Fc681e55bA7766b662405b50686` |
| `TimelockController` | `0x6E475C502EE311Ac5b639d558cf9af6204a504D2` |

Indexed by Convex from block **10935709** (`BITCHAN_ADDRESS` + `INDEX_START_BLOCK`
updated on the `upbeat-tern-346` deployment). Etherscan:
<https://sepolia.etherscan.io/address/0xE74dCFa376ca6B31a1697031d89857d58cBf4bD9>

## Sepolia (chain 11155111) — 2026-05-26

The full persistent governance stack **+ recurring elections**, deployed via
`DeployAll`, in the founding phase. Founder / interim president = the deployer
`0x8F23…6752` — **a key we control** (rotate before mainnet). Supersedes the
2026-05-25 deploy at `0x999b…9E33`, whose deployer/president key was lost.

| Contract | Address |
|---|---|
| `BitchanRepublic` | `0x53Fe019128e41fCA367Afc5CF004A9e63eae8ebd` |
| `BitchanElections` | `0x7223263700Bc1760cB8A05DaB8114CdEd0e16799` |
| `BitchanGovernor` | `0xfe2228259718014bd93b256B96601fF45b111D4b` |
| `BitchanJudiciary` | `0x3B37b9520A75Fd7C93a52D1603dD3CD83f425Bb1` |
| `TimelockController` | `0x8CAb566F8F9dAFef8b34841979b68EDe61f9f855` |

Indexed by Convex from block **10928965**. Etherscan:
<https://sepolia.etherscan.io/address/0x53Fe019128e41fCA367Afc5CF004A9e63eae8ebd>

Verified on-chain at deploy: `foundingPhase = true`, `president` = the founder,
`election` wired to `BitchanElections` (set once, installs each year's winner),
Governor & Judiciary bound to the Republic, and the **Timelock holds
`GOVERNANCE_ROLE`** (the only path to parameters/treasury is propose → vote →
timelock → execute).

**Redeploy** (any network): `DEPLOYER_PK=… forge script script/DeployAll.s.sol:DeployAll --rpc-url <rpc> --broadcast --slow`.
After a Sepolia redeploy, update `web/src/lib/contract.ts` (SEPOLIA_REPUBLIC),
`contracts/.env`, and the Convex env (`BITCHAN_ADDRESS`, `INDEX_START_BLOCK`),
then run `convex run admin:reset` to clear the prior deployment's indexed data.
