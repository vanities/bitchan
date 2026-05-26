#!/usr/bin/env bash
# bitchan dev loop. The app runs against the live Sepolia deployment, backed by
# Convex (the cloud indexer + gasless engagement). This starts:
#   - convex dev   : watches web/convex/ and pushes function changes live
#   - vite         : the web app (reads VITE_CHAIN=sepolia from web/.env.local)
# Ctrl-C tears both down.
#
# Anvil/Foundry is a SEPARATE concern now (Convex can't index a local chain):
#   bun run anvil                 # local chain for contract work
#   bun run contracts:test        # forge tests
#   bun run contracts:deploy:local && bun run seed   # deploy + demo content on anvil
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"

if [ ! -f .env.local ] || ! grep -q '^VITE_CONVEX_URL=' .env.local; then
  echo "web/.env.local is missing VITE_CONVEX_URL — run \`bunx convex dev\` once to create the project." >&2
  exit 1
fi

PIDS=()
cleanup() {
  echo
  echo "shutting down bitchan…"
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

echo "▸ starting convex dev (functions watcher)…"
bunx convex dev &
PIDS+=($!)

echo "▸ starting web (vite)…"
bun run dev &
PIDS+=($!)

cat <<EOF

bitchan dev is up:
  • convex   functions watcher → deployment from web/.env.local
  • web      http://localhost:5173  (VITE_CHAIN=sepolia → live Sepolia + Convex)

New posts take ~30s to appear (Sepolia block time + the index cron).
Press Ctrl-C to stop.
EOF

wait
