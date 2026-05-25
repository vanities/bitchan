import type { ReactNode } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { TimelinePost } from "../lib/graphql";
import type { Handles } from "../lib/useTimeline";
import { useEngagement } from "../lib/engagement";
import { bitchanAbi, bitchanAddress, chain, ZERO_BYTES32 } from "../lib/contract";
import { PostCard } from "./PostCard";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

export function Feed({
  posts,
  handles,
  onReply,
  onOpenProfile,
  loading,
  error,
  empty,
}: {
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  loading?: boolean;
  error?: unknown;
  empty?: ReactNode;
}) {
  const { address } = useAccount();
  const { data: engagement } = useEngagement(
    posts.map((p) => p.id),
    address,
  );

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
          onOpenProfile={onOpenProfile}
          canModerate={canModerate}
          eng={engagement?.[p.id]}
        />
      ))}
    </ul>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-bone-dim">{children}</div>;
}
