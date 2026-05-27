import { useCallback } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { usePref } from "./prefs";

export type Handles = Map<string, string | null>;
export type Avatars = Map<string, string | null>;

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

const PAGE = 30;

/** Shared timeline — Convex is reactive, so every view shares one live subscription.
 * Paginated: the home feed loads more on scroll; other views filter the loaded set. */
export function useTimeline() {
  const {
    results: rows,
    status,
    loadMore: loadMoreRaw,
  } = usePaginatedQuery(api.posts.timeline, {}, { initialNumItems: PAGE });
  const loadMore = useCallback(() => loadMoreRaw(PAGE), [loadMoreRaw]);
  const accts = useQuery(api.accounts.list, {});
  // Blocked authors (viewer-local) are removed everywhere; muted authors stay but
  // their cards collapse (handled in PostCard). See [[bitchan-design-principles]].
  const { list: blocked } = usePref("blocked");

  const handles: Handles = new Map();
  const avatars: Avatars = new Map();
  for (const a of accts ?? []) {
    handles.set(a.address.toLowerCase(), a.handle);
    avatars.set(a.address.toLowerCase(), a.avatar);
  }

  const posts: TimelinePost[] = rows
    .filter((p) => !blocked.includes(p.author.toLowerCase()))
    .map((p) => ({
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
    avatars,
    isLoading: status === "LoadingFirstPage",
    error: undefined as unknown,
    loadMore,
    canLoadMore: status === "CanLoadMore",
  };
}
