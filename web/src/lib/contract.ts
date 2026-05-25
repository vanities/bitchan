import { foundry } from "wagmi/chains";
import { bitchanAbi } from "./bitchanAbi";

export const bitchanAddress = (import.meta.env.VITE_BITCHAN_ADDRESS ??
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

export const chain = foundry;

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export { bitchanAbi };
