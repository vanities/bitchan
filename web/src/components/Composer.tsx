import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { bitchanAbi, bitchanAddress, chain, ZERO_BYTES32 } from "../lib/contract";

const MAX = 280;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

export type ReplyTarget = { id: string; handle: string | null; author: `0x${string}` };

export function Composer({
  replyTo,
  onClearReply,
  onGoProfile,
}: {
  replyTo?: ReplyTarget | null;
  onClearReply?: () => void;
  onGoProfile?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [text, setText] = useState("");
  const [showStamp, setShowStamp] = useState(false);
  const qc = useQueryClient();

  const { data: postFee } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "postFee",
    chainId: chain.id,
  });
  const { data: myHandle } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "handleOf",
    args: [address ?? ZERO_ADDR],
    chainId: chain.id,
    query: { enabled: !!address },
  });

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    setText("");
    setShowStamp(true);
    onClearReply?.();
    qc.invalidateQueries({ queryKey: ["timeline"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    const t = setTimeout(() => setShowStamp(false), 1600);
    return () => clearTimeout(t);
  }, [isSuccess, qc, onClearReply]);

  function submit() {
    const body = text.trim();
    if (!body) return;
    writeContract({
      address: bitchanAddress,
      abi: bitchanAbi,
      functionName: "post",
      args: [body, ZERO_BYTES32, replyTo ? BigInt(replyTo.id) : 0n, 0n],
      value: (postFee as bigint | undefined) ?? 0n,
      chainId: chain.id,
    });
  }

  if (!isConnected) {
    return (
      <div className="border-b border-line px-5 py-8 text-center">
        <p className="text-2xl font-bold leading-snug tracking-tight text-bone">
          Take your seat in the republic.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-bone-dim">
          Reading is free. You only pay to speak — a small fee keeps out spam and
          funds the board instead of ads.
        </p>
      </div>
    );
  }

  const fee = postFee !== undefined ? formatEther(postFee as bigint) : "…";
  const handle = (myHandle as string | undefined) || "";
  const over = text.length > MAX;

  return (
    <div className="relative border-b border-line px-4 py-4">
      {showStamp && (
        <div className="pointer-events-none absolute right-5 top-3 z-10">
          <span className="animate-stamp inline-block rounded border-2 border-seal px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-seal">
            sealed on-chain
          </span>
        </div>
      )}

      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-ink-soft px-3 py-1.5 text-xs">
          <span className="text-bone-dim">
            replying to <span className="text-bone">{replyTo.handle ?? "anon"}</span> · #{replyTo.id}
          </span>
          <button onClick={onClearReply} className="text-seal hover:underline">
            cancel
          </button>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 text-xs">
        {handle ? (
          <span className="font-semibold text-brass">{handle}</span>
        ) : (
          <>
            <span className="font-mono text-bone-dim">posting as anon·{address?.slice(2, 6)}</span>
            <button onClick={onGoProfile} className="text-seal hover:underline">
              claim a name
            </button>
          </>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={replyTo ? "Write your reply…" : "Address the republic…"}
        rows={3}
        className="w-full resize-none bg-transparent text-lg leading-snug placeholder:text-bone-dim/60 focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-bone-dim">{fee} ETH · funds the board, not ads</span>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs ${over ? "text-seal" : "text-bone-dim"}`}>
            {MAX - text.length}
          </span>
          <button
            onClick={submit}
            disabled={!text.trim() || over || isPending || isMining}
            className="rounded-md bg-seal px-5 py-1.5 text-sm font-bold text-[#fff7ec] transition hover:bg-seal-bright disabled:opacity-40"
          >
            {isPending ? "confirm…" : isMining ? "sealing…" : replyTo ? "Reply" : "Post"}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 font-mono text-xs text-seal">{error.message.split("\n")[0]}</p>}
    </div>
  );
}
