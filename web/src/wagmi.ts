import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { foundry } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "bitchan",
  // A real WalletConnect Cloud id is only needed for mobile/WalletConnect wallets.
  // Injected wallets (MetaMask on desktop) work with this placeholder.
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "bitchan-local-dev",
  chains: [foundry],
  transports: {
    [foundry.id]: http("http://127.0.0.1:8545"),
  },
  ssr: false,
});
