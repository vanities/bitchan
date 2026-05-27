import { useEffect, useState } from "react";
import { useAccount, useReadContract, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { keccak256, stringToBytes } from "viem";
import type { TimelinePost, Handles } from "../lib/useTimeline";
import { bitchanAbi, bitchanAddress, chain, explorerAddress } from "../lib/contract";
import { useEnsName } from "../lib/ens";
import { submitReaction, useFollowing, useFollowers } from "../lib/engagement";
import { Feed, Notice } from "./Feed";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ProfileView({
  address,
  posts,
  handles,
  onReply,
  onOpenProfile,
  onOpenPost,
  onQuote,
  loading,
  error,
}: {
  address: string | null;
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
  onQuote?: (post: TimelinePost) => void;
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
  const { data: ensName } = useEnsName(address);
  const { data: profileFollowing } = useFollowing(address ?? undefined);
  const { data: profileFollowers } = useFollowers(address ?? undefined);
  const [listView, setListView] = useState<"following" | "followers" | null>(null);

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
  const explorer = explorerAddress(address);
  const viewer = viewerAddr?.toLowerCase();
  const isSelf = !!viewer && viewer === addr;
  const handle = handles.get(addr) ?? null;
  const theirPosts = posts.filter((p) => p.author.toLowerCase() === addr);
  const isFollowing = new Set(followingArr ?? []).has(addr);
  const followingCount = profileFollowing?.length ?? 0;
  const followerCount = profileFollowers?.length ?? 0;
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
            {(handle ?? ensName ?? "a")[0]!.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-bold tracking-tight text-bone">{handle ?? ensName ?? "anonymous"}</div>
            {explorer ? (
              <a
                href={explorer}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-bone-dim transition hover:text-brass hover:underline"
              >
                {address.slice(0, 10)}…{address.slice(-6)} ↗
              </a>
            ) : (
              <div className="font-mono text-xs text-bone-dim">
                {address.slice(0, 10)}…{address.slice(-6)}
              </div>
            )}
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

        <div className="mt-3 flex gap-4 text-sm">
          <button
            onClick={() => setListView("following")}
            disabled={!followingCount}
            className="transition hover:underline disabled:opacity-50"
          >
            <span className="font-bold text-bone">{followingCount}</span> <span className="text-bone-dim">Following</span>
          </button>
          <button
            onClick={() => setListView("followers")}
            disabled={!followerCount}
            className="transition hover:underline disabled:opacity-50"
          >
            <span className="font-bold text-bone">{followerCount}</span> <span className="text-bone-dim">Followers</span>
          </button>
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
        onQuote={onQuote}
        loading={loading}
        error={error}
        empty={<Notice>{isSelf ? "You haven't posted yet — head to The Square." : "No posts yet."}</Notice>}
      />

      {listView && (
        <FollowList
          title={listView === "following" ? "Following" : "Followers"}
          addresses={listView === "following" ? (profileFollowing ?? []) : (profileFollowers ?? [])}
          handles={handles}
          onOpenProfile={(a) => {
            setListView(null);
            onOpenProfile?.(a);
          }}
          onClose={() => setListView(null)}
        />
      )}
    </div>
  );
}

function FollowList({
  title,
  addresses,
  handles,
  onOpenProfile,
  onClose,
}: {
  title: string;
  addresses: string[];
  handles: Handles;
  onOpenProfile?: (a: `0x${string}`) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-line bg-ink p-0">
        <DialogTitle className="border-b border-line px-4 py-3 text-sm font-bold text-bone">{title}</DialogTitle>
        <ul className="max-h-[60vh] overflow-y-auto">
          {addresses.length === 0 && <li className="px-4 py-6 text-center text-sm text-bone-dim">Nobody yet.</li>}
          {addresses.map((a) => (
            <li key={a}>
              <button
                onClick={() => onOpenProfile?.(a as `0x${string}`)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-ink-soft"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-seal text-xs font-bold text-white">
                  {(handles.get(a.toLowerCase()) ?? "a")[0]!.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-bone">{handles.get(a.toLowerCase()) ?? "anon"}</span>
                  <span className="block truncate font-mono text-[11px] text-bone-dim">
                    {a.slice(0, 10)}…{a.slice(-6)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
