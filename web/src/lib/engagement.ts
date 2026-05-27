import { useQuery } from "convex/react";
import { privateKeyToAccount } from "viem/accounts";
import { api } from "../../convex/_generated/api";
import { convex } from "./convex";
import { getSession } from "./session";
import { chain } from "./contract";

// Must match the Convex `reactions.react` action's domain/types exactly.
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

/** Live like/repost counts (+ viewer state) for a batch of posts. */
export function useEngagement(postIds: string[], viewer?: string) {
  const rows = useQuery(api.engagement.engagement, postIds.length > 0 ? { postIds, viewer } : "skip");
  let data: EngagementMap | undefined;
  if (rows) {
    data = {};
    for (const r of rows) {
      data[r.postId] = {
        likes: r.likes,
        reposts: r.reposts,
        likedByViewer: r.likedByViewer,
        repostedByViewer: r.repostedByViewer,
      };
    }
  }
  return { data };
}

/** Lowercased set of addresses `account` follows (live). */
export function useFollowing(account?: string) {
  const res = useQuery(api.engagement.following, account ? { account } : "skip");
  return { data: res ? res.following.map((a) => a.toLowerCase()) : undefined };
}

/** Lowercased set of addresses that follow `account` (live). */
export function useFollowers(account?: string) {
  const res = useQuery(api.engagement.followers, account ? { account } : "skip");
  return { data: res ? res.followers.map((a) => a.toLowerCase()) : undefined };
}

/** Lowercased accounts that liked/reposted `target`, fetched only when `enabled`. */
export function useReactors(target: string, kind: "like" | "repost", enabled: boolean) {
  const res = useQuery(api.engagement.reactors, enabled ? { target, kind } : "skip");
  return { data: res ? res.accounts.map((a) => a.toLowerCase()) : undefined };
}

/** Post ids `account` has liked (live). */
export function useLikedPosts(account?: string) {
  const res = useQuery(api.engagement.likes, account ? { account } : "skip");
  return { data: res ? res.postIds : undefined };
}

/** Live notifications for a viewer (replies/mentions/follows/likes/reposts). */
export function useNotifications(viewer?: string, handle?: string | null) {
  return useQuery(api.notifications.feed, viewer ? { viewer, handle: handle ?? undefined } : "skip");
}

type SignTypedDataAsync = (args: {
  domain: typeof engagementDomain;
  types: typeof engagementTypes;
  primaryType: "Reaction";
  message: { kind: ReactionKind; target: string; active: boolean; nonce: bigint };
}) => Promise<`0x${string}`>;

/** Sign an engagement toggle (gasless — a signature, not a transaction) and submit it to Convex. */
export async function submitReaction(opts: {
  signTypedDataAsync: SignTypedDataAsync;
  address: `0x${string}`;
  kind: ReactionKind;
  target: string;
  active: boolean;
}): Promise<void> {
  // One wallet popup authorizes a browser session key; reactions after that are
  // signed silently by the delegate key (no popup) until it expires.
  const session = await getSession(
    opts.address,
    opts.signTypedDataAsync as unknown as Parameters<typeof getSession>[1],
  );
  const delegate = privateKeyToAccount(session.privateKey);
  const nonce = BigInt(Date.now());
  const signature = await delegate.signTypedData({
    domain: engagementDomain,
    types: engagementTypes,
    primaryType: "Reaction",
    message: { kind: opts.kind, target: opts.target, active: opts.active, nonce },
  });

  await convex.action(api.reactions.react, {
    address: opts.address,
    kind: opts.kind,
    target: opts.target,
    active: opts.active,
    nonce: nonce.toString(),
    signature,
    delegate: session.delegate,
    expiry: session.expiry.toString(),
    delegationSig: session.delegationSig,
  });
}
