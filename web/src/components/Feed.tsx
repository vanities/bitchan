import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import type { TimelinePost } from "../lib/graphql";
import type { Handles } from "../lib/useTimeline";
import { useEngagement, useFollowing } from "../lib/engagement";
import { PostCard } from "./PostCard";

export function Feed({
  posts,
  handles,
  onReply,
  loading,
  error,
  empty,
}: {
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  loading?: boolean;
  error?: unknown;
  empty?: ReactNode;
}) {
  const { address } = useAccount();
  const viewer = address?.toLowerCase();
  const { data: engagement } = useEngagement(
    posts.map((p) => p.id),
    address,
  );
  const { data: followingArr } = useFollowing(address);
  const followingSet = new Set(followingArr ?? []);

  if (loading) return <Notice>reading the ledger…</Notice>;
  if (error) {
    return (
      <Notice>
        the indexer is offline — start it with{" "}
        <code className="font-mono text-bone">bun run indexer:dev</code>
      </Notice>
    );
  }
  if (posts.length === 0) {
    return <>{empty ?? <Notice>Nothing here yet.</Notice>}</>;
  }

  return (
    <ul>
      {posts.map((p, i) => (
        <PostCard
          key={p.id}
          post={p}
          handle={handles.get(p.author.toLowerCase()) ?? null}
          index={i}
          onReply={onReply}
          eng={engagement?.[p.id]}
          viewer={viewer}
          isFollowing={followingSet.has(p.author.toLowerCase())}
        />
      ))}
    </ul>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-bone-dim">{children}</div>;
}
