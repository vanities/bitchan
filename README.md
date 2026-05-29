# bitchan

An on-chain social republic — a censorship-resistant, X-style timeline on
Ethereum L1. Posts are written to the chain; moderation is **transparent and
elected**, governed by a constitution ratified by a convention of the 42 Framers.

**Live:** https://bitchan.vercel.app (contracts on the Sepolia testnet)

![bitchan](docs/screenshot.png)

**Docs:** [White paper](docs/WHITEPAPER.md) · [Architecture](docs/ARCHITECTURE.md) · [Constitution](docs/CONSTITUTION.md) · [Ratifying Convention](docs/CONVENTION.md) · [Governance MVP spec](docs/GOVERNANCE_MVP.md)

## How it works

- **Posts** are on-chain (the post fee funds the treasury, not ads).
- **Engagement** (likes / reposts / follows) is **gasless**: one wallet signature
  authorizes a 30-day browser session key, then reactions are signed silently and
  verified server-side — no popup, no gas per like.
- **Media** (images, video, multi-image galleries) is stored **off-chain in
  Convex** — content-addressed by the same `sha256` that goes on-chain as the
  post's `mediaHash`, NSFW-screened on upload, and deletable so illegal content
  can be removed. (Durable storage via Arweave is a planned upgrade.)
- **The read model** — timeline, accounts, and the governance log — is
  materialized from chain events by a **Convex** cron that polls Sepolia (this
  replaced the old Ponder indexer + engagement server).
- **Moderation** has two layers: the elected president/custodians can publish
  transparent, on-chain `hide` events (never deletes; everything stays forkable),
  and each viewer has a local **block / mute** floor they control themselves.

## Monorepo

| Package      | What                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| `contracts/` | Solidity 0.8.30 + Foundry — the `Bitchan` + governance contracts + tests   |
| `web/`       | Vite + React + Tailwind (mobile-first), wagmi / viem / RainbowKit          |
| `web/convex/`| Convex backend — chain indexer cron, gasless engagement, media, link previews |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- [Foundry](https://book.getfoundry.sh) (`forge`, `anvil`, `cast`) — for the contracts

## Contracts

```bash
cd contracts
forge test            # 100+ tests
forge build
```

## Web app

The app talks to the Sepolia-deployed contracts and a Convex backend. Config
lives in `web/.env.local` (`VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, the RPC URL).

```bash
cd web
bun install
bunx convex dev       # backend (functions + the chain-indexer cron), keep running
bun run dev           # Vite dev server → http://localhost:5173

bun run typecheck     # tsc --noEmit
bun run lint          # eslint
bun run test          # vitest
```

Commits run a pre-commit hook (Prettier + ESLint + typecheck + Vitest on staged
web files; `forge test` when Solidity changes).

## License

[GNU General Public License v3.0](LICENSE)
