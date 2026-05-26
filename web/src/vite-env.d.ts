/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN?: "anvil" | "sepolia";
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_BITCHAN_ADDRESS?: `0x${string}`;
  readonly VITE_ELECTION_ADDRESS?: string;
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_CONVEX_SITE_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
