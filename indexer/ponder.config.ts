import { createConfig } from "ponder";

import { BitchanAbi } from "./abis/BitchanAbi";

const RPC = process.env.PONDER_RPC_URL_31337 ?? "http://127.0.0.1:8545";
// Anvil's deterministic first-deploy address (Deploy.s.sol from account #0).
const ADDRESS =
  (process.env.BITCHAN_ADDRESS as `0x${string}` | undefined) ??
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default createConfig({
  chains: {
    anvil: {
      id: 31337,
      rpc: RPC,
    },
  },
  contracts: {
    Bitchan: {
      chain: "anvil",
      abi: BitchanAbi,
      address: ADDRESS,
      startBlock: 0,
    },
  },
});
