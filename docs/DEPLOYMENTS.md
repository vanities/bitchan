# Deployments

## Sepolia (chain 11155111) — 2026-05-25

The full persistent governance stack, deployed via `DeployAll`, in the founding
phase. Founder / interim president = the deployer `0xc1b873…6ec5` (rotate before
mainnet). Elections and recalls are deployed per-instance, not by `DeployAll`.

| Contract | Address |
|---|---|
| `BitchanRepublic` | `0x999b0cC06B0511017c0076efe458568977ff9E33` |
| `BitchanGovernor` | `0xad5c1343b22eE53B992b4f935B0cad57321E3bCe` |
| `BitchanJudiciary` | `0x1D0c2fbF6f0d603b72e6e0Cf426e5d7bDfd7124c` |
| `TimelockController` | `0x881D8b477570F08E36D1cB1fd201Dc9646303A7a` |

Etherscan: <https://sepolia.etherscan.io/address/0x999b0cC06B0511017c0076efe458568977ff9E33>

Verified on-chain at deploy: `foundingPhase = true`, Governor & Judiciary bound to
the Republic, and the **Timelock holds `GOVERNANCE_ROLE`** (the only path to
parameters/treasury is propose → vote → timelock → execute).

**Redeploy** (any network): `DEPLOYER_PK=… forge script script/DeployAll.s.sol:DeployAll --rpc-url <rpc> --broadcast`,
or trigger the `Deploy (Sepolia)` GitHub Action.
