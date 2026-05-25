import { foundry } from "wagmi/chains";
import { bitchanAbi } from "./bitchanAbi";
import { electionAbi } from "./electionAbi";

export const bitchanAddress = (import.meta.env.VITE_BITCHAN_ADDRESS ??
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

/// The active election contract (set by scripts/seed-election.sh). "" = none.
export const electionAddress = (import.meta.env.VITE_ELECTION_ADDRESS ?? "") as string;

export const chain = foundry;

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export { bitchanAbi, electionAbi };
