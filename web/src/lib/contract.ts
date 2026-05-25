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
const SEPOLIA_REPUBLIC = "0x999b0cC06B0511017c0076efe458568977ff9E33";

export const bitchanAddress = (import.meta.env.VITE_BITCHAN_ADDRESS ??
  (isSepolia ? SEPOLIA_REPUBLIC : ANVIL_REPUBLIC)) as `0x${string}`;

/// The active election contract (per-instance; "" = none on this network).
export const electionAddress = (import.meta.env.VITE_ELECTION_ADDRESS ?? "") as string;

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export { bitchanAbi, electionAbi };
