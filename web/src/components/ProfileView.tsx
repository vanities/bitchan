import { useEffect, useState } from "react";
import { useAccount, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { TimelinePost } from "../lib/graphql";
import type { Handles } from "../lib/useTimeline";
import { bitchanAbi, bitchanAddress, chain } from "../lib/contract";
import { submitReaction, useFollowing } from "../lib/engagement";
import { Feed, Notice } from "./Feed";
import { Button } from "@/components/ui/button";

export function ProfileView({
  address,
  posts,
  handles,
  onReply,
  onOpenProfile,
  loading,
  error,
}: {
  address: string | null;
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  loading?: boolean;
  error?: unknown;
}) {
  const { address: viewerAddr, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const qc = useQueryClient();
  const [handleInput, setHandleInput] = useState("");
  const [busyFollow, setBusyFollow] = useState(false);

  const { data: hHash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: hHash });
  useEffect(() => {
    if (!isSuccess) return;
    setHandleInput("");
    qc.invalidateQueries({ queryKey: ["timeline"] });
  }, [isSuccess, qc]);

  const { data: followingArr } = useFollowing(viewerAddr);

  if (!address) return <Notice>No profile selected.</Notice>;

  const addr = address.toLowerCase();
  const viewer = viewerAddr?.toLowerCase();
  const isSelf = !!viewer && viewer === addr;
  const handle = handles.get(addr) ?? null;
  const theirPosts = posts.filter((p) => p.author.toLowerCase() === addr);
  const isFollowing = new Set(followingArr ?? []).has(addr);

  function claim() {
    const h = handleInput.trim();
    if (!h) return;
    writeContract({ address: bitchanAddress, abi: bitchanAbi, functionName: "setHandle", args: [h], chainId: chain.id });
  }

  async function toggleFollow() {
    if (!viewerAddr || busyFollow) return;
    setBusyFollow(true);
    try {
      await submitReaction({ signTypedDataAsync, address: viewerAddr, kind: "follow", target: addr, active: !isFollowing });
      qc.invalidateQueries({ queryKey: ["following"] });
    } catch (e) {
      console.error("follow failed", e);
    } finally {
      setBusyFollow(false);
    }
  }

  return (
    <div>
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-seal text-xl font-bold text-white">
            {(handle ?? "a")[0]!.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-bold tracking-tight text-bone">{handle ?? "anonymous"}</div>
            <div className="font-mono text-xs text-bone-dim">
              {address.slice(0, 10)}…{address.slice(-6)}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-bold tabular-nums text-bone">{theirPosts.length}</div>
              <div className="label-civic text-[9px] text-bone-dim">dispatches</div>
            </div>
            {!isSelf && isConnected && (
              <Button
                onClick={toggleFollow}
                disabled={busyFollow}
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className={`rounded-full px-4 font-semibold ${isFollowing ? "border-brass text-brass hover:text-brass" : ""}`}
              >
                {busyFollow ? "…" : isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        {isSelf && (
          <div className="mt-4 flex gap-2">
            <input
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder={handle ? "change your handle" : "claim a handle"}
              maxLength={32}
              className="flex-1 rounded-md border border-line bg-ink-soft px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
            <button
              onClick={claim}
              disabled={!handleInput.trim() || isPending}
              className="rounded-md border border-brass px-4 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10 disabled:opacity-40"
            >
              {isPending ? "…" : handle ? "change" : "claim"}
            </button>
          </div>
        )}
        {isSelf && writeError && (
          <p className="mt-2 font-mono text-xs text-seal">{writeError.message.split("\n")[0]}</p>
        )}
        {!isConnected && !isSelf && (
          <p className="mt-3 text-xs text-bone-dim">Connect a wallet to follow.</p>
        )}
      </div>

      <Feed
        posts={theirPosts}
        handles={handles}
        onReply={onReply}
        onOpenProfile={onOpenProfile}
        loading={loading}
        error={error}
        empty={<Notice>{isSelf ? "You haven't posted yet — head to The Square." : "No posts yet."}</Notice>}
      />
    </div>
  );
}
