import { useQuery } from "@tanstack/react-query";
import { chain } from "./contract";

const ENGAGEMENT_URL = (import.meta.env.VITE_ENGAGEMENT_URL ?? "http://localhost:42070").replace(
  /\/$/,
  "",
);

// Must match the server's domain/types exactly.
export const engagementDomain = { name: "bitchan", version: "1", chainId: chain.id } as const;
export const engagementTypes = {
  Reaction: [
    { name: "kind", type: "string" },
    { name: "target", type: "string" },
    { name: "active", type: "bool" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export type Engagement = {
  likes: number;
  reposts: number;
  likedByViewer: boolean;
  repostedByViewer: boolean;
};
export type EngagementMap = Record<string, Engagement>;
export type ReactionKind = "like" | "repost" | "follow";

export async function fetchEngagement(postIds: string[], viewer?: string): Promise<EngagementMap> {
  if (postIds.length === 0) return {};
  const u = new URL(`${ENGAGEMENT_URL}/engagement`);
  u.searchParams.set("postIds", postIds.join(","));
  if (viewer) u.searchParams.set("viewer", viewer);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`engagement HTTP ${res.status}`);
  return (await res.json()) as EngagementMap;
}

export function useEngagement(postIds: string[], viewer?: string) {
  return useQuery({
    queryKey: ["engagement", viewer ?? "", postIds.join(",")],
    queryFn: () => fetchEngagement(postIds, viewer),
    enabled: postIds.length > 0,
    refetchInterval: 5000,
  });
}

export async function fetchFollowing(account?: string): Promise<string[]> {
  if (!account) return [];
  const u = new URL(`${ENGAGEMENT_URL}/following`);
  u.searchParams.set("account", account);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`following HTTP ${res.status}`);
  const j = (await res.json()) as { following: string[] };
  return (j.following ?? []).map((a) => a.toLowerCase());
}

/** Lowercased set of addresses `account` follows. */
export function useFollowing(account?: string) {
  return useQuery({
    queryKey: ["following", account ?? ""],
    queryFn: () => fetchFollowing(account),
    enabled: !!account,
    refetchInterval: 8000,
  });
}

type SignTypedDataAsync = (args: {
  domain: typeof engagementDomain;
  types: typeof engagementTypes;
  primaryType: "Reaction";
  message: { kind: ReactionKind; target: string; active: boolean; nonce: bigint };
}) => Promise<`0x${string}`>;

/** Sign an engagement toggle (gasless — a signature, not a transaction) and POST it. */
export async function submitReaction(opts: {
  signTypedDataAsync: SignTypedDataAsync;
  address: `0x${string}`;
  kind: ReactionKind;
  target: string;
  active: boolean;
}): Promise<void> {
  const nonce = BigInt(Date.now());
  const message = { kind: opts.kind, target: opts.target, active: opts.active, nonce };

  const signature = await opts.signTypedDataAsync({
    domain: engagementDomain,
    types: engagementTypes,
    primaryType: "Reaction",
    message,
  });

  const res = await fetch(`${ENGAGEMENT_URL}/react`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      address: opts.address,
      kind: opts.kind,
      target: opts.target,
      active: opts.active,
      nonce: nonce.toString(),
      signature,
    }),
  });
  if (!res.ok) throw new Error(`react HTTP ${res.status}`);
}
