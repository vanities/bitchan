import { useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Repeat2, type LucideIcon } from "lucide-react";
import type { TimelinePost } from "../lib/graphql";
import { submitReaction, type Engagement } from "../lib/engagement";
import { hasMedia, idFromHash, mediaUrl, useMediaInfo } from "../lib/media";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PostCard({
  post,
  handle,
  index = 0,
  onReply,
  onOpenProfile,
  eng,
}: {
  post: TimelinePost;
  handle: string | null;
  index?: number;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  eng?: Engagement;
}) {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"like" | "repost" | null>(null);

  const isReply = post.parentId !== "0";
  const likes = eng?.likes ?? 0;
  const reposts = eng?.reposts ?? 0;
  const liked = eng?.likedByViewer ?? false;
  const reposted = eng?.repostedByViewer ?? false;

  async function react(kind: "like" | "repost") {
    if (!address || busy) return;
    setBusy(kind);
    try {
      const active = kind === "like" ? !liked : !reposted;
      await submitReaction({ signTypedDataAsync, address, kind, target: post.id, active });
      qc.invalidateQueries({ queryKey: ["engagement"] });
    } catch (e) {
      console.error("reaction failed", e);
    } finally {
      setBusy(null);
    }
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
          <span className="truncate font-semibold text-bone group-hover:underline">{handle ?? "anon"}</span>
          <span className="font-mono text-xs text-bone-dim">{short(post.author)}</span>
        </button>
        <span className="text-bone-dim">·</span>
        <span className="font-mono text-xs text-bone-dim">{timeAgo(post.createdAt)}</span>
        {isReply && (
          <span className="font-mono text-[10px] text-bone-dim">↳ re #{post.parentId}</span>
        )}
        <span className="ml-auto font-mono text-[10px] text-bone-dim/60">#{post.id}</span>
      </div>

      {post.text && (
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-normal text-bone">
          {post.text}
        </p>
      )}

      {hasMedia(post.mediaHash) && <MediaView hash={post.mediaHash} />}

      <div className="mt-2.5 flex items-center gap-7">
        <Action
          icon={MessageCircle}
          label={post.replyCount}
          onClick={onReply ? () => onReply(post) : undefined}
          disabled={!isConnected || !onReply}
          color="bone"
        />
        <Action icon={Repeat2} label={reposts} onClick={() => react("repost")} disabled={!isConnected || busy !== null} active={reposted} color="brass" />
        <Action icon={Heart} label={likes} onClick={() => react("like")} disabled={!isConnected || busy !== null} active={liked} filled={liked} color="seal" />
      </div>
    </li>
  );
}

function MediaView({ hash }: { hash: `0x${string}` }) {
  const id = idFromHash(hash);
  const { data: info, isLoading, error } = useMediaInfo(id);
  const url = mediaUrl(id);

  if (isLoading) {
    return <div className="mt-2 h-40 animate-pulse rounded-xl border border-line bg-ink-soft/50" />;
  }
  if (error || !info) {
    return (
      <div className="mt-2 rounded-xl border border-line bg-ink-soft/50 px-3 py-2 font-mono text-[11px] text-bone-dim">
        media unavailable · {id.slice(0, 12)}…
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
  const hover = color === "seal" ? "hover:text-seal" : color === "brass" ? "hover:text-brass" : "hover:text-bone";
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

function timeAgo(secStr: string) {
  const sec = Number(secStr);
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
