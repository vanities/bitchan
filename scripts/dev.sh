#!/usr/bin/env bash
# Spin up the full bitchan local environment:
#   anvil (local chain) -> deploy Bitchan -> ponder (indexer) -> vite (web)
# Ctrl-C tears everything down.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RPC="http://127.0.0.1:8545"
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

PIDS=()
cleanup() {
  echo
  echo "shutting down bitchan…"
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

# 1. anvil — start fresh, or reuse one that's already up
if cast block-number --rpc-url "$RPC" >/dev/null 2>&1; then
  echo "✓ reusing anvil already running on 8545"
else
  echo "▸ starting anvil…"
  anvil --silent &
  PIDS+=($!)
  until cast block-number --rpc-url "$RPC" >/dev/null 2>&1; do sleep 0.3; done
fi

# 2. build + deploy
echo "▸ building + deploying contracts…"
( cd contracts && forge build >/dev/null )
DEPLOY_OUT="$(cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" --broadcast 2>/dev/null)"
ADDR="$(echo "$DEPLOY_OUT" | grep "Bitchan deployed at:" | awk '{print $NF}')"
[ -n "$ADDR" ] || { echo "deploy failed"; echo "$DEPLOY_OUT"; exit 1; }
echo "  Bitchan @ $ADDR"

# 3. regenerate the TS ABI from the fresh artifact
bash scripts/sync-abi.sh >/dev/null

# 4. wire the address into indexer + web
{ echo "BITCHAN_ADDRESS=$ADDR"; echo "PONDER_RPC_URL_31337=$RPC"; } > indexer/.env.local
{ echo "VITE_BITCHAN_ADDRESS=$ADDR"; echo "VITE_PONDER_URL=http://localhost:42069/graphql"; echo "VITE_ENGAGEMENT_URL=http://localhost:42070"; } > web/.env.local

# 5. indexer (fresh state so it re-indexes against the new deploy)
echo "▸ starting indexer (ponder)…"
( cd indexer && rm -rf .ponder && bun run dev ) &
PIDS+=($!)

# 5b. engagement server (gasless likes/reposts/follows)
echo "▸ starting engagement server…"
( cd server && bun run dev ) &
PIDS+=($!)

# 6. web
echo "▸ starting web (vite)…"
( cd web && bun run dev ) &
PIDS+=($!)

cat <<EOF

bitchan local env is up:
  • anvil    $RPC  (chainId 31337)
  • indexer  http://localhost:42069/graphql
  • server   http://localhost:42070  (gasless engagement)
  • web      http://localhost:5173

Run \`bun run seed\` in another terminal to post demo content.
Press Ctrl-C to stop everything.
EOF

wait
