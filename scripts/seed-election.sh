#!/usr/bin/env bash
# Phase-2 demo: stand up a live presidential election on the running local chain.
# Ages citizens past the 60-day vote gate, ends founding, deploys + wires the
# election, nominates two candidates, opens voting, and exposes the address to web.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
RPC="${RPC:-http://127.0.0.1:8545}"
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

REPUBLIC="${BITCHAN_ADDRESS:-$(grep -h '^BITCHAN_ADDRESS=' indexer/.env.local 2>/dev/null | cut -d= -f2)}"
REPUBLIC="${REPUBLIC:-0x5FbDB2315678afecb367f032d93F642f64180aa3}"
PK0=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # founder / president
PK1=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d   # citizen
PK2=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a   # the demo UI voter
A0=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
A1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

echo "▸ ensuring the demo voter (acct #2) is a citizen…"
cast send "$REPUBLIC" "claimCitizenship()" --value 0.003ether --private-key $PK2 --rpc-url "$RPC" >/dev/null 2>&1 || echo "  (already a citizen)"

echo "▸ aging citizens 61 days (past the 60-day vote gate)…"
cast rpc evm_increaseTime 5270400 --rpc-url "$RPC" >/dev/null
cast rpc evm_mine --rpc-url "$RPC" >/dev/null

echo "▸ ending founding (abdicate)…"
cast send "$REPUBLIC" "abdicate()" --private-key $PK0 --rpc-url "$RPC" >/dev/null 2>&1 || echo "  (founding already ended)"

NOW=$(cast block latest --field timestamp --rpc-url "$RPC")
NOM=$((NOW + 86400)); VOTE=$((NOW + 259200))
echo "▸ deploying election (nominate ≤ $NOM, vote ≤ $VOTE)…"
EL=$(cd contracts && forge create src/BitchanElection.sol:BitchanElection \
  --private-key $PK0 --rpc-url "$RPC" --broadcast \
  --constructor-args "$REPUBLIC" "$NOM" "$VOTE" 2>/dev/null | grep -i 'Deployed to' | awk '{print $NF}')
[ -n "$EL" ] || { echo "election deploy failed"; exit 1; }
echo "  election @ $EL"

echo "▸ wiring election + nominating two candidates…"
cast send "$REPUBLIC" "setElection(address)" "$EL" --private-key $PK0 --rpc-url "$RPC" >/dev/null
cast send "$EL" "nominate()" --private-key $PK0 --rpc-url "$RPC" >/dev/null
cast send "$EL" "nominate()" --private-key $PK1 --rpc-url "$RPC" >/dev/null

echo "▸ opening voting (advancing past the nomination window)…"
cast rpc evm_increaseTime 86401 --rpc-url "$RPC" >/dev/null
cast rpc evm_mine --rpc-url "$RPC" >/dev/null

# expose to the web app (Vite restarts on .env.local change)
if grep -q '^VITE_ELECTION_ADDRESS=' web/.env.local 2>/dev/null; then
  sed -i '' "s|^VITE_ELECTION_ADDRESS=.*|VITE_ELECTION_ADDRESS=$EL|" web/.env.local
else
  echo "VITE_ELECTION_ADDRESS=$EL" >> web/.env.local
fi

echo "✓ election live in VOTING phase: $EL"
echo "  candidates: $A0, $A1   phase=$(cast call "$EL" 'phase()(uint8)' --rpc-url "$RPC")"
