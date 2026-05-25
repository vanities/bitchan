import { useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { TimelinePost } from "../lib/graphql";
import { submitReaction, type Engagement } from "../lib/engagement";

export function PostCard({
  post,
  handle,
  index = 0,
  onReply,
  eng,
  viewer,
  isFollowing,
}: {
  post: TimelinePost;
  handle: string | null;
  index?: number;
  onReply?: (post: TimelinePost) => void;
  eng?: Engagement;
  viewer?: string;
  isFollowing?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"like" | "repost" | "follow" | null>(null);

  const hasMedia = post.mediaHash != null && !/^0x0+$/.test(post.mediaHash);
  const isReply = post.parentId !== "0";

  const likes = eng?.likes ?? 0;
  const reposts = eng?.reposts ?? 0;
  const liked = eng?.likedByViewer ?? false;
  const reposted = eng?.repostedByViewer ?? false;
  const canFollow = isConnected && !!viewer && post.author.toLowerCase() !== viewer;

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

  async function toggleFollow() {
    if (!address || busy) return;
    setBusy("follow");
    try {
      await submitReaction({
        signTypedDataAsync,
        address,
        kind: "follow",
        target: post.author,
        active: !isFollowing,
      });
      qc.invalidateQueries({ queryKey: ["following"] });
    } catch (e) {
      console.error("follow failed", e);
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
        <span className="truncate font-semibold text-bone">{handle ?? "anon"}</span>
        <span className="font-mono text-xs text-bone-dim">{short(post.author)}</span>
        <span className="text-bone-dim">·</span>
        <span className="font-mono text-xs text-bone-dim">{timeAgo(post.createdAt)}</span>
        {isReply && (
          <span className="font-mono text-[10px] text-bone-dim">↳ re #{post.parentId}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {canFollow && (
            <button
              onClick={toggleFollow}
              disabled={busy !== null}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                isFollowing
                  ? "border-brass text-brass"
                  : "border-line text-bone hover:border-bone"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
          <span className="font-mono text-[10px] text-bone-dim/60">#{post.id}</span>
        </div>
      </div>

      <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-normal text-bone">
        {post.text}
      </p>

      {hasMedia && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-ink-soft/50 px-3 py-2">
          <span className="text-brass">⛓</span>
          <span className="font-mono text-[11px] text-bone-dim">
            media on Arweave · {post.mediaHash.slice(0, 14)}…
          </span>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-7">
        <Action
          glyph="↩"
          label={post.replyCount}
          onClick={onReply ? () => onReply(post) : undefined}
          disabled={!isConnected || !onReply}
          color="bone"
        />
        <Action
          glyph="↺"
          label={reposts}
          onClick={() => react("repost")}
          disabled={!isConnected || busy !== null}
          active={reposted}
          color="brass"
        />
        <Action
          glyph="♥"
          label={likes}
          onClick={() => react("like")}
          disabled={!isConnected || busy !== null}
          active={liked}
          color="seal"
        />
        <span className="label-civic ml-auto text-[9px] text-bone-dim/60">gasless</span>
      </div>
    </li>
  );
}

function Action({
  glyph,
  label,
  onClick,
  disabled,
  active,
  color = "bone",
}: {
  glyph: string;
  label: number;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
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
      className={`flex items-center gap-1.5 text-xs transition disabled:opacity-50 ${activeCls} ${hover}`}
    >
      <span className="text-sm">{glyph}</span>
      {label}
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
