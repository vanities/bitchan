// Seed the LIVE deployment with demo content so the timeline isn't empty.
//
// Unlike scripts/seed.sh (which posts to a local Anvil chain), this targets the
// real Sepolia BitchanRepublic that bitchan.vercel.app reads from, and uploads
// image bytes to the same Convex backend the site serves media from. It posts a
// text post, a YouTube-link post (the client auto-embeds the player), an image
// post, and a reply — all from one funded testnet account.
//
// Run from web/:  bun scripts/seed-sepolia.mjs
// Or via:         make seed-sepolia   (resolves the contract address from Convex)
//
// Config (all optional; sensible defaults are derived from the repo):
//   SEED_PK           testnet poster key      (default: contracts/.env SEED_PK)
//   RPC_URL           Sepolia RPC             (default: contracts/.env / publicnode)
//   BITCHAN_ADDRESS   Republic address        (default: current Sepolia deploy)
//   CONVEX_URL        Convex deployment .cloud (default: web/.env.local VITE_CONVEX_URL)
//   CONVEX_SITE_URL   Convex media .site       (default: web/.env.local VITE_CONVEX_SITE_URL)
//   IMAGE_PATH        image to post            (default: docs/design/C-rwb-dark.png)
//   HANDLE            handle to claim          (default: publius)

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  keccak256,
  toBytes,
  formatEther,
  zeroHash,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(__dirname, "..");
const ROOT = resolve(WEB, "..");

// ── tiny .env reader (no deps) ──────────────────────────────────────────────
function readEnv(path, key) {
  if (!existsSync(path)) return undefined;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, "").split(/\s+#/)[0].trim();
  }
  return undefined;
}
const fromContractsEnv = (k) => readEnv(resolve(ROOT, "contracts/.env"), k);
const fromWebEnv = (k) => readEnv(resolve(WEB, ".env.local"), k);

// ── config ──────────────────────────────────────────────────────────────────
const SEED_PK = process.env.SEED_PK || fromContractsEnv("SEED_PK");
const RPC_URL =
  process.env.RPC_URL || fromContractsEnv("SEPOLIA_RPC_URL") || "https://ethereum-sepolia-rpc.publicnode.com";
// The Republic the live site + Convex indexer use. `make` overrides this with the
// authoritative value from `convex env get BITCHAN_ADDRESS`; the default mirrors
// web/src/lib/contract.ts SEPOLIA_REPUBLIC — keep them in sync on every redeploy.
const BITCHAN_ADDRESS = process.env.BITCHAN_ADDRESS || "0xE74dCFa376ca6B31a1697031d89857d58cBf4bD9";
const CONVEX_URL = process.env.CONVEX_URL || fromWebEnv("VITE_CONVEX_URL");
const CONVEX_SITE_URL = (process.env.CONVEX_SITE_URL || fromWebEnv("VITE_CONVEX_SITE_URL") || "").replace(/\/$/, "");
const IMAGE_PATH = resolve(ROOT, process.env.IMAGE_PATH || "docs/design/C-rwb-dark.png");
const HANDLE = process.env.HANDLE || "publius";

if (!SEED_PK) throw new Error("SEED_PK not set (and not found in contracts/.env)");
if (!CONVEX_URL) throw new Error("CONVEX_URL not set (and VITE_CONVEX_URL not found in web/.env.local)");

const ZERO = zeroHash; // 0x000…0 (32 bytes) — "no media"

// minimal ABI — just what we call
const ABI = [
  { type: "function", name: "postFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "handleOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "string" }] },
  { type: "function", name: "ownerOfHandle", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "address" }] },
  { type: "function", name: "setHandle", stateMutability: "nonpayable", inputs: [{ type: "string" }], outputs: [] },
  {
    type: "function",
    name: "post",
    stateMutability: "payable",
    inputs: [
      { name: "text", type: "string" },
      { name: "mediaHash", type: "bytes32" },
      { name: "parentId", type: "uint256" },
      { name: "quotedId", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "event",
    name: "Posted",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "author", type: "address", indexed: true },
      { name: "parentId", type: "uint256", indexed: true },
      { name: "quotedId", type: "uint256", indexed: false },
      { name: "mediaHash", type: "bytes32", indexed: false },
      { name: "text", type: "string", indexed: false },
      { name: "createdAt", type: "uint256", indexed: false },
    ],
  },
];

// EIP-712 domain — must match web/src/lib/contract.ts signingDomain and the Convex
// backend's bitchanDomain() (verifyingContract = the Republic the backend indexes).
const domain = { name: "bitchan", version: "1", chainId: sepolia.id, verifyingContract: BITCHAN_ADDRESS };
const UPLOAD_TYPES = {
  Upload: [
    { name: "hash", type: "string" },
    { name: "size", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

const account = privateKeyToAccount(SEED_PK.startsWith("0x") ? SEED_PK : `0x${SEED_PK}`);
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) });
const convex = new ConvexHttpClient(CONVEX_URL);

const EXPLORER = "https://sepolia.etherscan.io";
const log = (...a) => console.log(...a);

// ── helpers ───────────────────────────────────────────────────────────────
async function ensureHandle() {
  const current = await publicClient.readContract({ address: BITCHAN_ADDRESS, abi: ABI, functionName: "handleOf", args: [account.address] });
  if (current && current.length) return log(`▸ handle already set: @${current}`);
  const owner = await publicClient.readContract({ address: BITCHAN_ADDRESS, abi: ABI, functionName: "ownerOfHandle", args: [keccak256(toBytes(HANDLE))] });
  if (owner !== "0x0000000000000000000000000000000000000000" && owner.toLowerCase() !== account.address.toLowerCase()) {
    return log(`▸ handle @${HANDLE} is taken — posting as anon·${account.address.slice(2, 6)}`);
  }
  const hash = await wallet.writeContract({ address: BITCHAN_ADDRESS, abi: ABI, functionName: "setHandle", args: [HANDLE] });
  await publicClient.waitForTransactionReceipt({ hash });
  log(`▸ claimed handle @${HANDLE}  ${EXPLORER}/tx/${hash}`);
}

let postFee;
async function sendPost(label, text, { mediaHash = ZERO, parentId = 0n, quotedId = 0n } = {}) {
  const hash = await wallet.writeContract({
    address: BITCHAN_ADDRESS,
    abi: ABI,
    functionName: "post",
    args: [text, mediaHash, parentId, quotedId],
    value: postFee,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const [ev] = parseEventLogs({ abi: ABI, eventName: "Posted", logs: receipt.logs });
  const id = ev.args.id.toString();
  log(`  ✓ ${label} → post #${id}   ${EXPLORER}/tx/${hash}`);
  return id;
}

async function uploadImage(path) {
  const data = readFileSync(path);
  const size = data.byteLength;
  const hash = "0x" + createHash("sha256").update(data).digest("hex");
  const deadline = Math.floor(Date.now() / 1000) + 600;
  // Direct EIP-712 signature from the poster (no session delegation needed server-side).
  const signature = await account.signTypedData({
    domain,
    types: UPLOAD_TYPES,
    primaryType: "Upload",
    message: { hash, size: BigInt(size), deadline: BigInt(deadline) },
  });
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + size); // exact bytes
  const r = await convex.action(api.mediaActions.upload, {
    bytes: ab,
    address: account.address,
    signature,
    deadline: String(deadline),
  });
  log(`  ✓ uploaded image ${r.hash} (${r.mime}, ${(r.size / 1024).toFixed(0)} KB)`);
  if (CONVEX_SITE_URL) log(`    served at ${CONVEX_SITE_URL}/media/${r.hash}`);
  return r.hash;
}

// ── run ─────────────────────────────────────────────────────────────────────
log(`seeding ${BITCHAN_ADDRESS} on Sepolia`);
log(`  poster:  ${account.address}`);
log(`  convex:  ${CONVEX_URL}`);
const balance = await publicClient.getBalance({ address: account.address });
log(`  balance: ${formatEther(balance)} ETH`);

postFee = await publicClient.readContract({ address: BITCHAN_ADDRESS, abi: ABI, functionName: "postFee" });
log(`  postFee: ${formatEther(postFee)} ETH each\n`);

await ensureHandle();

log(`\n▸ posting…`);
const textId = await sendPost(
  "text",
  "the network is ours. no landlords, no gatekeepers — only citizens and code. reading is free; you only pay to speak.",
);
await sendPost(
  "youtube",
  "submitted for the public record — a little perspective from a fellow citizen. https://www.youtube.com/watch?v=GO5FwsblpT8",
);
log(`\n▸ uploading + posting image…`);
const mediaHash = await uploadImage(IMAGE_PATH);
await sendPost("image", "the seal and the standard — a free republic, on-chain.", { mediaHash });

log(`\n▸ adding a reply (a little thread)…`);
await sendPost("reply", "seconded. cheap to read, costly to fake — that's the whole charter.", { parentId: BigInt(textId) });

log(`\n✓ done. New posts appear on https://bitchan.vercel.app within ~30s (block time + index cron).`);
