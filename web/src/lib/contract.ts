import { foundry, sepolia } from "wagmi/chains";
import { bitchanAbi } from "./bitchanAbi";
import { electionAbi } from "./electionAbi";

/// Network switch: `VITE_CHAIN=sepolia` targets the live Sepolia deployment;
/// anything else (the default) targets the local Anvil dev chain.
export const isSepolia = import.meta.env.VITE_CHAIN === "sepolia";
export const chain = isSepolia ? sepolia : foundry;
export const rpcUrl = isSepolia
  ? ((import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com") as string)
  : "http://127.0.0.1:8545";

// Per-network contract defaults; override any with the matching VITE_*_ADDRESS.
const ANVIL_REPUBLIC = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const SEPOLIA_REPUBLIC = "0x53Fe019128e41fCA367Afc5CF004A9e63eae8ebd";

export const bitchanAddress = (import.meta.env.VITE_BITCHAN_ADDRESS ??
  (isSepolia ? SEPOLIA_REPUBLIC : ANVIL_REPUBLIC)) as `0x${string}`;

/// The active election contract (per-instance; "" = none on this network).
export const electionAddress = (import.meta.env.VITE_ELECTION_ADDRESS ?? "") as string;

export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

// EIP-712 domain shared by every off-chain signer (reactions, profile, avatar,
// galleries, media uploads). Bound to the chain AND the BitchanRepublic deployment
// (verifyingContract) so signatures can't be replayed across chains or forks. Must
// match the backend's bitchanDomain() (convex/lib/eip712.ts) exactly.
export const signingDomain = {
  name: "bitchan",
  version: "1",
  chainId: chain.id,
  verifyingContract: bitchanAddress,
} as const;

// Per-action signatures carry a short deadline so a captured one can't be replayed
// indefinitely. 10 minutes is ample for sign-then-submit.
export const SIGNATURE_TTL_SECONDS = 600;
export const signatureDeadline = () => Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS;

/// Block explorer for the active chain (null on Anvil — no explorer to link to).
export const explorerBase = chain.blockExplorers?.default.url ?? null;
export const explorerAddress = (addr: string) => (explorerBase ? `${explorerBase}/address/${addr}` : null);

export { bitchanAbi, electionAbi };
