import { useEffect, useRef, type ReactNode } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { TimelinePost, Handles } from "../lib/useTimeline";
import { useEngagement } from "../lib/engagement";
import { bitchanAbi, bitchanAddress, chain, ZERO_BYTES32 } from "../lib/contract";
import { PostCard } from "./PostCard";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

export function Feed({
  posts,
  handles,
  onReply,
  onOpenProfile,
  onOpenPost,
  onOpenTag,
  onQuote,
  loading,
  error,
  empty,
  depths,
  onLoadMore,
  canLoadMore,
  pinnedId,
}: {
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
  onOpenTag?: (tag: string) => void;
  onQuote?: (post: TimelinePost) => void;
  loading?: boolean;
  error?: unknown;
  empty?: ReactNode;
  // Optional reply-nesting depth per post id (thread view); 0/absent = top level.
  depths?: Map<string, number>;
  // Infinite scroll (home feed only): called when the sentinel scrolls into view.
  onLoadMore?: () => void;
  canLoadMore?: boolean;
  // Float this post id to the top with a "Pinned" badge (profile Posts tab).
  pinnedId?: string;
}) {
  const { address } = useAccount();
  const { data: engagement } = useEngagement(
    posts.map((p) => p.id),
    address,
  );
  const byId = new Map(posts.map((p) => [p.id, p]));

  // Whether the viewer can moderate (president or a custodian). Reads dedupe across cards.
  const mod = { address: bitchanAddress, abi: bitchanAbi, chainId: chain.id } as const;
  const { data: president } = useReadContract({ ...mod, functionName: "president" });
  const { data: custodianRole } = useReadContract({ ...mod, functionName: "CUSTODIAN_ROLE" });
  const { data: isCustodian } = useReadContract({
    ...mod,
    functionName: "hasRole",
    args: [(custodianRole as `0x${string}`) ?? ZERO_BYTES32, address ?? ZERO_ADDR],
    query: { enabled: !!custodianRole && !!address },
  });
  const canModerate =
    !!address &&
    ((!!president && address.toLowerCase() === (president as string).toLowerCase()) || isCustodian === true);

  if (loading) return <Notice>reading the ledger…</Notice>;
  if (error) {
    return (
      <Notice>
        the backend is unreachable — check <code className="font-mono text-bone">VITE_CONVEX_URL</code>
      </Notice>
    );
  }
  if (posts.length === 0) {
    return <>{empty ?? <Notice>Nothing here yet.</Notice>}</>;
  }

  const ordered =
    pinnedId && posts.some((p) => p.id === pinnedId)
      ? [posts.find((p) => p.id === pinnedId)!, ...posts.filter((p) => p.id !== pinnedId)]
      : posts;

  return (
    <ul>
      {ordered.map((p, i) => (
        <PostCard
          key={p.id}
          post={p}
          handle={handles.get(p.author.toLowerCase()) ?? null}
          index={i}
          onReply={onReply}
          onOpenProfile={onOpenProfile}
          onOpenPost={onOpenPost}
          onOpenTag={onOpenTag}
          onQuote={onQuote}
          canModerate={canModerate}
          eng={engagement?.[p.id]}
          handles={handles}
          quotedPost={p.quotedId !== "0" ? (byId.get(p.quotedId) ?? null) : null}
          depth={depths?.get(p.id) ?? 0}
          pinned={p.id === pinnedId}
        />
      ))}
      {onLoadMore && canLoadMore && <LoadMoreSentinel onLoadMore={onLoadMore} />}
    </ul>
  );
}

// Fires onLoadMore when scrolled near the bottom (infinite scroll). Only mounted
// while there's more to load, so it can't loop.
function LoadMoreSentinel({ onLoadMore }: { onLoadMore: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMore]);
  return (
    <li ref={ref} className="py-6 text-center text-xs text-bone-dim">
      loading more…
    </li>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-bone-dim">{children}</div>;
}
