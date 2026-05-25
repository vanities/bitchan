#!/usr/bin/env bash
# Post demo content to a running local bitchan (anvil + deployed contract).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="${RPC:-http://127.0.0.1:8545}"
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

ADDR="${BITCHAN_ADDRESS:-$(grep -h '^BITCHAN_ADDRESS=' "$ROOT/indexer/.env.local" 2>/dev/null | cut -d= -f2)}"
ADDR="${ADDR:-0x5FbDB2315678afecb367f032d93F642f64180aa3}"

# Anvil dev accounts (local only).
PK0=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PK1=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
A0=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
ZERO=0x0000000000000000000000000000000000000000000000000000000000000000
MEDIA="$(cast keccak "arweave-demo-txid")"

s() { cast send "$ADDR" "$@" --rpc-url "$RPC" >/dev/null; }

echo "seeding $ADDR …"
s "setHandle(string)" "satoshi" --private-key $PK0
s "post(string,bytes32,uint256,uint256)" "gm bitchan. the republic lives." $ZERO 0 0 --value 0.0001ether --private-key $PK0
s "post(string,bytes32,uint256,uint256)" "first post with media attached" $MEDIA 0 0 --value 0.0001ether --private-key $PK0
s "post(string,bytes32,uint256,uint256)" "nice to be here anon" $ZERO 1 0 --value 0.0001ether --private-key $PK1
s "like(uint256)" 1 --private-key $PK1
s "follow(address)" $A0 --private-key $PK1
echo "seeded: 3 posts (1 reply), 1 like, 1 follow, handle 'satoshi'"
