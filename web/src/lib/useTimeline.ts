import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type Handles = Map<string, string | null>;

export type TimelinePost = {
  id: string;
  author: `0x${string}`;
  text: string;
  mediaHash: `0x${string}`;
  parentId: string;
  quotedId: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  hidden: boolean;
  hiddenReason: string | null;
  hiddenBy: `0x${string}` | null;
  createdAt: string;
};

export type AccountRow = { address: `0x${string}`; handle: string | null };

/** Shared timeline — Convex useQuery is reactive, so every view shares one live subscription. */
export function useTimeline() {
  const rows = useQuery(api.posts.timeline, { limit: 100 });
  const accts = useQuery(api.accounts.list, {});

  const handles: Handles = new Map();
  for (const a of accts ?? []) handles.set(a.address.toLowerCase(), a.handle);

  const posts: TimelinePost[] = (rows ?? []).map((p) => ({
    id: p.id,
    author: p.author as `0x${string}`,
    text: p.text,
    mediaHash: p.mediaHash as `0x${string}`,
    parentId: p.parentId,
    quotedId: p.quotedId,
    likeCount: p.likeCount,
    replyCount: p.replyCount,
    repostCount: p.repostCount,
    hidden: p.hidden,
    hiddenReason: p.hiddenReason,
    hiddenBy: p.hiddenBy as `0x${string}` | null,
    createdAt: String(p.createdAt),
  }));

  return {
    posts,
    handles,
    isLoading: rows === undefined,
    error: undefined as unknown,
  };
}
