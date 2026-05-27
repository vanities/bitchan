import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { ImagePlus, X } from "lucide-react";
import { bitchanAbi, bitchanAddress, chain, ZERO_BYTES32 } from "../lib/contract";
import { mediaUrl, uploadMedia, type UploadResult } from "../lib/media";
import { recordGallery } from "../lib/gallery";
import { firstEmbed } from "../lib/embeds";
import { Embed } from "./Embed";
import { Button } from "@/components/ui/button";

const MAX = 280;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

export type ReplyTarget = { id: string; handle: string | null; author: `0x${string}` };

export function Composer({
  replyTo,
  onClearReply,
  quoteTo,
  onClearQuote,
  onGoProfile,
}: {
  replyTo?: ReplyTarget | null;
  onClearReply?: () => void;
  quoteTo?: ReplyTarget | null;
  onClearQuote?: () => void;
  onGoProfile?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [text, setText] = useState("");
  const [showStamp, setShowStamp] = useState(false);
  const [media, setMedia] = useState<UploadResult[]>([]); // up to 4; >1 posts as a gallery
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Live preview of the first YouTube/Vimeo link as you type — same component the
  // feed uses. (Hook stays above the early return below.)
  const embed = useMemo(() => firstEmbed(text), [text]);

  useEffect(() => {
    if (!isSuccess) return;
    setText("");
    setMedia([]);
    setShowStamp(true);
    onClearReply?.();
    onClearQuote?.();
    const t = setTimeout(() => setShowStamp(false), 1600);
    return () => clearTimeout(t);
  }, [isSuccess, onClearReply, onClearQuote]);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 4 - media.length);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setMediaError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const r = await uploadMedia(file);
        setMedia((m) => (m.length < 4 ? [...m, r] : m));
        console.log("[media] uploaded", r.hash, r.mime, `${r.size}b`);
      }
    } catch (err) {
      console.error("[media] upload failed", err);
      setMediaError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const body = text.trim();
    if ((!body && media.length === 0 && !quoteTo) || uploading) return;
    // 0 → none, 1 → that image, >1 → a gallery (manifest hash).
    let mediaHash: `0x${string}` = ZERO_BYTES32;
    if (media.length === 1) mediaHash = media[0]!.hash;
    else if (media.length > 1) {
      try {
        mediaHash = await recordGallery(media.map((m) => m.hash));
      } catch (err) {
        console.error("[media] gallery record failed", err);
        setMediaError("couldn't save the gallery");
        return;
      }
    }
    writeContract({
      address: bitchanAddress,
      abi: bitchanAbi,
      functionName: "post",
      args: [body, mediaHash, replyTo ? BigInt(replyTo.id) : 0n, quoteTo ? BigInt(quoteTo.id) : 0n],
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
          Reading is free. You only pay to speak — a small fee keeps out spam and funds the board instead of
          ads.
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

      {quoteTo && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-ink-soft px-3 py-1.5 text-xs">
          <span className="text-bone-dim">
            quoting <span className="text-bone">{quoteTo.handle ?? "anon"}</span> · #{quoteTo.id}
          </span>
          <button onClick={onClearQuote} className="text-seal hover:underline">
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

      {media.length > 0 && (
        <div className={`mt-2 grid gap-1.5 ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {media.map((m, i) => (
            <div key={m.hash + i} className="relative overflow-hidden rounded-xl border border-line">
              <button
                onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))}
                className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-bone transition hover:text-seal"
                aria-label="remove media"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
              {m.mime.startsWith("video/") ? (
                <video src={mediaUrl(m.hash)} controls className="max-h-72 w-full bg-black" />
              ) : (
                <img src={mediaUrl(m.hash)} alt="" className="max-h-72 w-full bg-ink-soft object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
      {mediaError && <p className="mt-1 font-mono text-xs text-seal">media: {mediaError}</p>}

      {embed && <Embed embed={embed} />}

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || media.length >= 4}
            className="flex items-center gap-1.5 text-sm text-bone-dim transition hover:text-brass disabled:opacity-50"
          >
            <ImagePlus size={18} strokeWidth={2} />
            {uploading ? "uploading…" : media.length >= 4 ? "max 4" : "image / video"}
          </button>
          <span className="font-mono text-[11px] text-bone-dim">{fee} ETH · funds the board</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs ${over ? "text-seal" : "text-bone-dim"}`}>
            {MAX - text.length}
          </span>
          <Button
            onClick={submit}
            disabled={(!text.trim() && media.length === 0) || over || uploading || isPending || isMining}
            className="px-5 font-bold"
          >
            {isPending ? "confirm…" : isMining ? "sealing…" : replyTo ? "Reply" : "Post"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 font-mono text-xs text-seal">{error.message.split("\n")[0]}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={onPickFiles}
        className="hidden"
      />
    </div>
  );
}
