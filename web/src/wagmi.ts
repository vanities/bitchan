import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { foundry, sepolia } from "wagmi/chains";
import { isSepolia, rpcUrl } from "./lib/contract";

// VITE_CHAIN=sepolia → live Sepolia deployment; default → local Anvil.
export const wagmiConfig = getDefaultConfig({
  appName: "bitchan",
  // A real WalletConnect Cloud id is only needed for mobile/WalletConnect wallets.
  // Injected wallets (MetaMask on desktop) work with this placeholder.
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "bitchan-local-dev",
  chains: isSepolia ? [sepolia] : [foundry],
  transports: isSepolia ? { [sepolia.id]: http(rpcUrl) } : { [foundry.id]: http(rpcUrl) },
  ssr: false,
});
