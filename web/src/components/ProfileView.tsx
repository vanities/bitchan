import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { TimelinePost } from "../lib/graphql";
import type { Handles } from "../lib/useTimeline";
import { bitchanAbi, bitchanAddress, chain } from "../lib/contract";
import { Feed, Notice } from "./Feed";

export function ProfileView({
  posts,
  handles,
  onReply,
  loading,
  error,
}: {
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  loading?: boolean;
  error?: unknown;
}) {
  const { address, isConnected } = useAccount();
  const [handleInput, setHandleInput] = useState("");
  const qc = useQueryClient();

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    setHandleInput("");
    qc.invalidateQueries({ queryKey: ["timeline"] });
  }, [isSuccess, qc]);

  if (!isConnected || !address) {
    return <Notice>Connect a wallet to view your citizen profile.</Notice>;
  }

  const me = address.toLowerCase();
  const myHandle = handles.get(me) ?? null;
  const myPosts = posts.filter((p) => p.author.toLowerCase() === me);

  function claim() {
    const h = handleInput.trim();
    if (!h) return;
    writeContract({
      address: bitchanAddress,
      abi: bitchanAbi,
      functionName: "setHandle",
      args: [h],
      chainId: chain.id,
    });
  }

  return (
    <div>
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-seal text-lg font-bold text-[#fff7ec]">
            {(myHandle ?? "a")[0].toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-bone">{myHandle ?? "anonymous"}</div>
            <div className="font-mono text-xs text-bone-dim">
              {address.slice(0, 10)}…{address.slice(-6)}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-bold text-bone tabular-nums">{myPosts.length}</div>
            <div className="label-civic text-[9px] text-bone-dim">dispatches</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            placeholder={myHandle ? "change your handle" : "claim a handle"}
            maxLength={32}
            className="flex-1 rounded-md border border-line bg-ink-soft px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <button
            onClick={claim}
            disabled={!handleInput.trim() || isPending}
            className="rounded-md border border-brass px-4 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10 disabled:opacity-40"
          >
            {isPending ? "…" : myHandle ? "change" : "claim"}
          </button>
        </div>
        {writeError && (
          <p className="mt-2 font-mono text-xs text-seal">{writeError.message.split("\n")[0]}</p>
        )}
      </div>

      <Feed
        posts={myPosts}
        handles={handles}
        onReply={onReply}
        loading={loading}
        error={error}
        empty={<Notice>You haven't posted yet. Head to The Square and speak.</Notice>}
      />
    </div>
  );
}
