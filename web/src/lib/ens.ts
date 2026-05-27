import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, getAddress } from "viem";
import { mainnet } from "viem/chains";

// ENS lives on mainnet, so resolve against mainnet regardless of which chain the
// app targets. A dedicated client keeps this off the app's wagmi config (so the
// wallet/network UX stays pinned to the app chain). Falls back to short address.
const ensClient = createPublicClient({ chain: mainnet, transport: http() });

export function useEnsName(address?: string | null) {
  return useQuery({
    queryKey: ["ens-name", address?.toLowerCase()],
    queryFn: async (): Promise<string | null> => {
      if (!address) return null;
      try {
        return await ensClient.getEnsName({ address: getAddress(address) });
      } catch {
        return null;
      }
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 60, // ENS rarely changes — cache an hour
  });
}
