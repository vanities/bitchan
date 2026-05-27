import { useState, useEffect } from "react";
import { useAccount, useSignTypedData, useWriteContract } from "wagmi";
import { EyeOff, Heart, MessageCircle, Quote, Repeat2, type LucideIcon } from "lucide-react";
import type { TimelinePost, Handles } from "../lib/useTimeline";
import { submitReaction, type Engagement } from "../lib/engagement";
import { hasMedia, mediaUrl, useMediaInfo } from "../lib/media";
import { bitchanAbi, bitchanAddress, chain } from "../lib/contract";
import { useEnsName } from "../lib/ens";
import { MENTION_SPLIT_RE } from "../lib/mentions";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PostCard({
  post,
  handle,
  index = 0,
  onReply,
  onOpenProfile,
  onOpenPost,
  onQuote,
  canModerate,
  eng,
  handles,
  quotedPost,
}: {
  post: TimelinePost;
  handle: string | null;
  index?: number;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
  onQuote?: (post: TimelinePost) => void;
  canModerate?: boolean;
  eng?: Engagement;
  handles?: Handles;
  quotedPost?: TimelinePost | null;
}) {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { data: ensName } = useEnsName(post.author);
  const [busy, setBusy] = useState<"like" | "repost" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState("spam");
  const [optLike, setOptLike] = useState<boolean | null>(null);
  const [optRepost, setOptRepost] = useState<boolean | null>(null);

  const { writeContract: writeHide } = useWriteContract();

  const isReply = post.parentId !== "0";
  // Optimistic overrides for instant feedback; cleared once the reactive query catches up.
  const liked = optLike ?? eng?.likedByViewer ?? false;
  const reposted = optRepost ?? eng?.repostedByViewer ?? false;
  const likes = (eng?.likes ?? 0) + (optLike === null ? 0 : (optLike ? 1 : 0) - (eng?.likedByViewer ? 1 : 0));
  const reposts =
    (eng?.reposts ?? 0) + (optRepost === null ? 0 : (optRepost ? 1 : 0) - (eng?.repostedByViewer ? 1 : 0));

  useEffect(() => {
    if (optLike !== null && eng?.likedByViewer === optLike) setOptLike(null);
  }, [eng?.likedByViewer, optLike]);
  useEffect(() => {
    if (optRepost !== null && eng?.repostedByViewer === optRepost) setOptRepost(null);
  }, [eng?.repostedByViewer, optRepost]);

  async function react(kind: "like" | "repost") {
    if (!address || busy) return;
    const active = kind === "like" ? !liked : !reposted;
    if (kind === "like") setOptLike(active);
    else setOptRepost(active);
    setBusy(kind);
    try {
      await submitReaction({ signTypedDataAsync, address, kind, target: post.id, active });
    } catch (e) {
      console.error("reaction failed", e);
      if (kind === "like") setOptLike(null);
      else setOptRepost(null);
    } finally {
      setBusy(null);
    }
  }

  function confirmHide() {
    const r = reason.trim();
    if (!r) return;
    writeHide({
      address: bitchanAddress,
      abi: bitchanAbi,
      functionName: "hide",
      args: [BigInt(post.id), r],
      chainId: chain.id,
    });
    setHiding(false);
  }

  return (
    <li
      className="animate-fade-up border-b border-line px-4 py-3.5 transition-colors hover:bg-ink-soft/40"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="flex items-baseline gap-2">
        <button
          onClick={() => onOpenProfile?.(post.author)}
          className="group flex min-w-0 items-baseline gap-2"
        >
          <span className="truncate font-semibold text-bone group-hover:underline">
            {handle ?? ensName ?? "anon"}
          </span>
          <span className="font-mono text-xs text-bone-dim">{short(post.author)}</span>
        </button>
        <span className="text-bone-dim">·</span>
        <span className="font-mono text-xs text-bone-dim">{timeAgo(post.createdAt)}</span>
        {isReply && <span className="font-mono text-[10px] text-bone-dim">↳ re #{post.parentId}</span>}
        <span className="ml-auto font-mono text-[10px] text-bone-dim/60">#{post.id}</span>
      </div>

      {post.hidden && !revealed ? (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line/70 bg-ink-soft/50 px-3 py-2.5 text-xs text-bone-dim">
          <EyeOff size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            hidden{post.hiddenBy ? ` by ${short(post.hiddenBy)}` : ""}
            {post.hiddenReason ? ` · ${post.hiddenReason}` : ""}
          </span>
          <button
            onClick={() => setRevealed(true)}
            className="shrink-0 font-semibold text-brass hover:underline"
          >
            view anyway
          </button>
        </div>
      ) : (
        <>
          {post.hidden && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-seal">
              <EyeOff size={11} /> hidden by a moderator · shown via your right to fork
            </p>
          )}
          {post.text && (
            <p
              onClick={onOpenPost ? () => onOpenPost(post) : undefined}
              className={`mt-1 whitespace-pre-wrap break-words text-[15px] leading-normal text-bone ${onOpenPost ? "cursor-pointer" : ""}`}
            >
              {renderText(post.text, handles, onOpenProfile)}
            </p>
          )}
          {quotedPost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPost?.(quotedPost);
              }}
              className="mt-2 block w-full rounded-xl border border-line bg-ink-soft/40 px-3 py-2 text-left transition hover:border-brass/50"
            >
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="font-semibold text-bone">
                  {handles?.get(quotedPost.author.toLowerCase()) ?? "anon"}
                </span>
                <span className="font-mono text-bone-dim">{short(quotedPost.author)}</span>
              </div>
              <p className="mt-0.5 line-clamp-3 text-sm text-bone-dim">{quotedPost.text || "↳ media"}</p>
            </button>
          )}
          {hasMedia(post.mediaHash) && <MediaView hash={post.mediaHash} />}
        </>
      )}

      <div className="mt-2.5 flex items-center gap-7">
        <Action
          icon={MessageCircle}
          label={post.replyCount}
          onClick={onReply ? () => onReply(post) : undefined}
          disabled={!isConnected || !onReply}
          color="bone"
        />
        <Action
          icon={Repeat2}
          label={reposts}
          onClick={() => react("repost")}
          disabled={!isConnected || busy !== null}
          active={reposted}
          color="brass"
        />
        <Action
          icon={Heart}
          label={likes}
          onClick={() => react("like")}
          disabled={!isConnected || busy !== null}
          active={liked}
          filled={liked}
          color="seal"
        />
        <Action
          icon={Quote}
          label={0}
          onClick={onQuote ? () => onQuote(post) : undefined}
          disabled={!isConnected || !onQuote}
          color="bone"
        />
        {canModerate && !post.hidden && (
          <button
            onClick={() => setHiding((v) => !v)}
            title="hide (moderator)"
            className="ml-auto flex items-center gap-1 text-xs text-bone-dim transition hover:text-seal"
          >
            <EyeOff size={15} /> hide
          </button>
        )}
      </div>

      {hiding && (
        <div className="mt-2 flex gap-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="reason (logged on-chain)"
            className="min-w-0 flex-1 rounded-md border border-line bg-ink-soft px-2 py-1.5 text-xs focus:border-seal focus:outline-none"
          />
          <button
            onClick={confirmHide}
            className="rounded-md bg-seal px-3 text-xs font-bold text-white transition hover:bg-seal-bright"
          >
            hide
          </button>
          <button onClick={() => setHiding(false)} className="px-2 text-xs text-bone-dim hover:text-bone">
            cancel
          </button>
        </div>
      )}
    </li>
  );
}

function MediaView({ hash }: { hash: `0x${string}` }) {
  const info = useMediaInfo(hash);
  const url = mediaUrl(hash);

  if (info === undefined) {
    return <div className="mt-2 h-40 animate-pulse rounded-xl border border-line bg-ink-soft/50" />;
  }
  if (info === null) {
    return (
      <div className="mt-2 rounded-xl border border-line bg-ink-soft/50 px-3 py-2 font-mono text-[11px] text-bone-dim">
        media unavailable · {hash.slice(0, 12)}…
      </div>
    );
  }
  if (info.mime.startsWith("video/")) {
    return (
      <div className="mt-2 overflow-hidden rounded-xl border border-line">
        <video src={url} controls className="max-h-[480px] w-full bg-black" />
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="mt-2 block w-full overflow-hidden rounded-xl border border-line">
          <img
            src={url}
            alt=""
            loading="lazy"
            className="max-h-[480px] w-full cursor-zoom-in bg-ink-soft object-contain transition hover:opacity-90"
          />
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="w-auto max-w-[96vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[96vw]"
      >
        <DialogTitle className="sr-only">Expanded image</DialogTitle>
        <img src={url} alt="" className="max-h-[88vh] w-auto max-w-[96vw] rounded-lg object-contain" />
      </DialogContent>
    </Dialog>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  filled,
  color = "bone",
}: {
  icon: LucideIcon;
  label: number;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  filled?: boolean;
  color?: "seal" | "brass" | "bone";
}) {
  const hover =
    color === "seal" ? "hover:text-seal" : color === "brass" ? "hover:text-brass" : "hover:text-bone";
  const activeCls = active
    ? color === "seal"
      ? "text-seal"
      : color === "brass"
        ? "text-brass"
        : "text-bone"
    : "text-bone-dim";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-xs tabular-nums transition disabled:opacity-50 ${activeCls} ${hover}`}
    >
      <Icon size={17} strokeWidth={2} fill={filled ? "currentColor" : "none"} />
      {label > 0 && label}
    </button>
  );
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Linkify @handle mentions → profile links. Resolves against the address→handle
// map; unknown handles render as plain text. stopPropagation so a mention click
// doesn't also open the post thread.
function renderText(text: string, handles: Handles | undefined, onOpenProfile?: (a: `0x${string}`) => void) {
  if (!handles || !text.includes("@")) return text;
  const rev = new Map<string, string>();
  for (const [addr, h] of handles) if (h) rev.set(h, addr);
  return text.split(MENTION_SPLIT_RE).map((part, i) => {
    if (part.startsWith("@")) {
      const addr = rev.get(part.slice(1));
      if (addr) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile?.(addr as `0x${string}`);
            }}
            className="text-brass hover:underline"
          >
            {part}
          </button>
        );
      }
    }
    return part;
  });
}

function timeAgo(secStr: string) {
  const sec = Number(secStr);
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
