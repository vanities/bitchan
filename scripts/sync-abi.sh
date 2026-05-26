#!/usr/bin/env bash
# Regenerates the TypeScript ABI for the web app from the Foundry build
# artifact. Run after changing the contract: `bun run sync-abi`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

node -e '
const fs = require("fs");
const root = process.argv[1];
const art = root + "/contracts/out/BitchanRepublic.sol/BitchanRepublic.json";
if (!fs.existsSync(art)) {
  console.error("artifact not found: " + art + " — run `bun run contracts:build` first");
  process.exit(1);
}
const abi = JSON.stringify(JSON.parse(fs.readFileSync(art, "utf8")).abi);
fs.mkdirSync(root + "/web/src/lib", { recursive: true });
fs.writeFileSync(root + "/web/src/lib/bitchanAbi.ts", "export const bitchanAbi = " + abi + " as const;\n");
const elArt = root + "/contracts/out/BitchanElection.sol/BitchanElection.json";
if (fs.existsSync(elArt)) {
  const elAbi = JSON.stringify(JSON.parse(fs.readFileSync(elArt, "utf8")).abi);
  fs.writeFileSync(root + "/web/src/lib/electionAbi.ts", "export const electionAbi = " + elAbi + " as const;\n");
}
console.log("synced ABI -> web/src/lib/{bitchanAbi,electionAbi}.ts");
' "$ROOT"
