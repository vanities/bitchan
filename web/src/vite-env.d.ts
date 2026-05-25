/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BITCHAN_ADDRESS?: `0x${string}`;
  readonly VITE_PONDER_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
