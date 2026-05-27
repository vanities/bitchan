import { useEffect, useState } from "react";
import { useAccount, useReadContract, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { keccak256, stringToBytes } from "viem";
import type { TimelinePost, Handles } from "../lib/useTimeline";
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
  onOpenPost,
  loading,
  error,
}: {
  address: string | null;
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
  loading?: boolean;
  error?: unknown;
}) {
  const { address: viewerAddr, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [handleInput, setHandleInput] = useState("");
  const [busyFollow, setBusyFollow] = useState(false);

  const { data: hHash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isSuccess, isLoading: settling } = useWaitForTransactionReceipt({ hash: hHash });
  useEffect(() => {
    if (!isSuccess) return;
    setHandleInput("");
  }, [isSuccess]);

  const { data: followingArr } = useFollowing(viewerAddr);

  // Pre-check handle availability (debounced) so we error before signing a tx that
  // would revert HandleTaken. Key matches the contract: keccak256(bytes(handle)).
  const [debouncedHandle, setDebouncedHandle] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedHandle(handleInput.trim()), 350);
    return () => clearTimeout(t);
  }, [handleInput]);
  const { data: handleOwner } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "ownerOfHandle",
    args: [keccak256(stringToBytes(debouncedHandle))],
    chainId: chain.id,
    query: { enabled: debouncedHandle.length > 0 },
  });

  if (!address) return <Notice>No profile selected.</Notice>;

  const addr = address.toLowerCase();
  const viewer = viewerAddr?.toLowerCase();
  const isSelf = !!viewer && viewer === addr;
  const handle = handles.get(addr) ?? null;
  const theirPosts = posts.filter((p) => p.author.toLowerCase() === addr);
  const isFollowing = new Set(followingArr ?? []).has(addr);
  const handleOwnerLc = typeof handleOwner === "string" ? handleOwner.toLowerCase() : null;
  const handleTaken =
    !!handleOwnerLc && handleOwnerLc !== "0x0000000000000000000000000000000000000000" && handleOwnerLc !== addr;
  const handleFree = debouncedHandle.length > 0 && handleOwner !== undefined && !handleTaken;

  function claim() {
    const h = handleInput.trim();
    if (!h || handleTaken) return;
    writeContract({ address: bitchanAddress, abi: bitchanAbi, functionName: "setHandle", args: [h], chainId: chain.id });
  }

  async function toggleFollow() {
    if (!viewerAddr || busyFollow) return;
    setBusyFollow(true);
    try {
      await submitReaction({ signTypedDataAsync, address: viewerAddr, kind: "follow", target: addr, active: !isFollowing });
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
              disabled={!handleInput.trim() || isPending || settling || handleTaken}
              className="rounded-md border border-brass px-4 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10 disabled:opacity-40"
            >
              {isPending ? "confirm…" : settling ? "saving…" : handle ? "change" : "claim"}
            </button>
          </div>
        )}
        {isSelf && handleTaken && <p className="mt-1.5 font-mono text-[11px] text-seal">that handle is taken</p>}
        {isSelf && handleFree && <p className="mt-1.5 font-mono text-[11px] text-brass">available</p>}
        {isSelf && writeError && !/rejected|denied/i.test(writeError.message) && (
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
        onOpenPost={onOpenPost}
        loading={loading}
        error={error}
        empty={<Notice>{isSelf ? "You haven't posted yet — head to The Square." : "No posts yet."}</Notice>}
      />
    </div>
  );
}
