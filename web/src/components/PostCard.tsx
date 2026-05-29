import { useState, useEffect, useMemo, useRef } from "react";
import { useAccount, useSignTypedData, useWriteContract } from "wagmi";
import { EyeOff, Heart, MessageCircle, Pin, Quote, Repeat2, type LucideIcon } from "lucide-react";
import type { TimelinePost, Handles } from "../lib/useTimeline";
import { submitReaction, useReactors, type Engagement } from "../lib/engagement";
import { hasMedia, mediaUrl, useMediaInfo } from "../lib/media";
import { useGallery } from "../lib/gallery";
import { bitchanAbi, bitchanAddress, chain } from "../lib/contract";
import { useEnsName } from "../lib/ens";
import { tokenize } from "../lib/links";
import { firstEmbed } from "../lib/embeds";
import { usePref } from "../lib/prefs";
import { setPin } from "../lib/profile";
import { Embed } from "./Embed";
import { PostMenu } from "./PostMenu";
import { AccountList } from "./AccountList";
import { Avatar } from "./Avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// The whole post card is clickable (opens the thread). Clicks landing on these
// interactive descendants keep their own behavior instead of opening the post.
const INTERACTIVE = 'a, button, input, textarea, select, video, label, [role="dialog"], [role="menu"]';

export function PostCard({
  post,
  handle,
  avatar,
  index = 0,
  onReply,
  onOpenProfile,
  onOpenPost,
  onOpenTag,
  onQuote,
  canModerate,
  eng,
  handles,
  quotedPost,
  depth = 0,
  pinned = false,
  focused = false,
  connectedAbove = false,
  connectedBelow = false,
}: {
  post: TimelinePost;
  handle: string | null;
  avatar?: string | null; // the author's avatar media hash (monogram fallback if absent)
  index?: number;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
  onOpenTag?: (tag: string) => void;
  onQuote?: (post: TimelinePost) => void;
  canModerate?: boolean;
  eng?: Engagement;
  handles?: Handles;
  quotedPost?: TimelinePost | null;
  depth?: number;
  pinned?: boolean;
  // The focal post of a thread permalink: highlight it and scroll it into view.
  focused?: boolean;
  // Part of a reply pair in a flat feed: the original is rendered directly below
  // (connectedBelow = this is the original) or above (connectedAbove = this is the
  // reply). Draws a shared left rail and drops the divider between the two cards.
  connectedAbove?: boolean;
  connectedBelow?: boolean;
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
  const cardRef = useRef<HTMLLIElement>(null);
  // Scroll the focal post (a thread permalink target) into view once on open.
  useEffect(() => {
    if (focused) cardRef.current?.scrollIntoView({ block: "center" });
  }, [focused]);
  const embed = useMemo(() => firstEmbed(post.text), [post.text]);
  const { has: isMuted } = usePref("muted");
  const muted = isMuted(post.author);
  const [mutedShown, setMutedShown] = useState(false);
  const isOwn = !!address && address.toLowerCase() === post.author.toLowerCase();
  async function pin() {
    if (!address) return;
    try {
      // On your own profile the pinned card toggles off; elsewhere it pins this post.
      await setPin({ address, postId: pinned ? "" : post.id, signTypedDataAsync });
    } catch (e) {
      console.error("pin failed", e);
    }
  }
  const [reactorList, setReactorList] = useState<"like" | "repost" | null>(null);
  const { data: reactorAddrs } = useReactors(post.id, reactorList ?? "like", reactorList !== null);
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

  // Nested replies (thread view): indent + a left connector line per level, capped
  // so deep threads stay readable on mobile.
  const indent = Math.min(depth, 6);
  return (
    <li
      ref={cardRef}
      onClick={
        onOpenPost
          ? (e) => {
              // Open the post on a bare card click, but don't hijack clicks on
              // interactive children (buttons, links, media, menus) or a text drag.
              if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
              if (window.getSelection()?.toString()) return;
              onOpenPost(post);
            }
          : undefined
      }
      className={`animate-fade-up py-3.5 pr-4 transition-colors hover:bg-ink-soft/40 ${
        connectedBelow ? "" : "border-b border-line"
      } ${depth > 0 ? "border-l-2 border-l-brass/40" : ""}${focused ? " bg-brass/[0.07]" : ""}${
        onOpenPost ? " cursor-pointer" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms`, paddingLeft: 16 + indent * 18 }}
    >
      {pinned && (
        <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-bone-dim">
          <Pin size={11} /> Pinned
        </p>
      )}
      <div className="flex gap-2.5">
        {/* Avatar gutter — holds the thread line that connects a reply to the original above it. */}
        <div className="flex shrink-0 flex-col items-center" style={{ width: 40 }}>
          {connectedAbove && (
            <span aria-hidden className="w-0.5 bg-bone-dim/60" style={{ height: 14, marginTop: -14 }} />
          )}
          <Avatar
            address={post.author}
            label={handle ?? ensName}
            avatar={avatar}
            size={40}
            onClick={onOpenProfile ? () => onOpenProfile(post.author) : undefined}
            title="view profile"
          />
          {connectedBelow && (
            <span
              aria-hidden
              className="w-0.5 flex-1 bg-bone-dim/60"
              style={{ minHeight: 14, marginTop: 4, marginBottom: -14 }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
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
            {isReply && !connectedAbove && (
              <span className="font-mono text-[10px] text-bone-dim">↳ re #{post.parentId}</span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-bone-dim/60">#{post.id}</span>
              <PostMenu
                postId={post.id}
                author={post.author}
                handle={handle}
                onPin={isOwn ? pin : undefined}
                pinned={pinned}
              />
            </div>
          </div>

          {muted && !mutedShown ? (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line/70 bg-ink-soft/40 px-3 py-2.5 text-xs text-bone-dim">
              <EyeOff size={14} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">Muted{handle ? ` · @${handle}` : ""}</span>
              <button
                onClick={() => setMutedShown(true)}
                className="shrink-0 font-semibold text-brass hover:underline"
              >
                show
              </button>
            </div>
          ) : (
            <>
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
                    <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-normal text-bone">
                      {renderText(post.text, handles, onOpenProfile, onOpenTag)}
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
                      <p className="mt-0.5 line-clamp-3 text-sm text-bone-dim">
                        {quotedPost.text || "↳ media"}
                      </p>
                    </button>
                  )}
                  {hasMedia(post.mediaHash) && <MediaView hash={post.mediaHash} />}
                  {embed && <Embed embed={embed} />}
                </>
              )}

              <div className="mt-2.5 flex items-center gap-7">
                <Action
                  icon={MessageCircle}
                  label={post.replyCount}
                  alwaysShowCount
                  onClick={onReply ? () => onReply(post) : undefined}
                  disabled={!isConnected || !onReply}
                  color="bone"
                />
                <Action
                  icon={Repeat2}
                  label={reposts}
                  alwaysShowCount
                  onClick={() => react("repost")}
                  onCountClick={reposts > 0 ? () => setReactorList("repost") : undefined}
                  disabled={!isConnected || busy !== null}
                  active={reposted}
                  color="brass"
                />
                <Action
                  icon={Heart}
                  label={likes}
                  alwaysShowCount
                  onClick={() => react("like")}
                  onCountClick={likes > 0 ? () => setReactorList("like") : undefined}
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
                  <button
                    onClick={() => setHiding(false)}
                    className="px-2 text-xs text-bone-dim hover:text-bone"
                  >
                    cancel
                  </button>
                </div>
              )}
            </>
          )}
          {reactorList && (
            <AccountList
              title={reactorList === "like" ? "Liked by" : "Reposted by"}
              addresses={reactorAddrs}
              handles={handles ?? new Map()}
              onOpenProfile={(a) => {
                setReactorList(null);
                onOpenProfile?.(a);
              }}
              onClose={() => setReactorList(null)}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function MediaView({ hash }: { hash: `0x${string}` }) {
  const gallery = useGallery(hash);
  const info = useMediaInfo(hash);
  const url = mediaUrl(hash);

  // A hash that maps to a gallery is a multi-image post.
  if (gallery === undefined) {
    return <div className="mt-2 h-40 animate-pulse rounded-xl border border-line bg-ink-soft/50" />;
  }
  if (gallery && gallery.length > 0) {
    return (
      <div
        className={`mt-2 grid gap-1 overflow-hidden rounded-xl border border-line ${gallery.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {gallery.map((h, i) => (
          <Dialog key={h + i}>
            <DialogTrigger asChild>
              <button type="button" className="overflow-hidden">
                <img
                  src={mediaUrl(h)}
                  alt=""
                  loading="lazy"
                  className="h-full max-h-72 w-full cursor-zoom-in bg-ink-soft object-cover transition hover:opacity-90"
                />
              </button>
            </DialogTrigger>
            <DialogContent
              aria-describedby={undefined}
              className="w-auto max-w-[96vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[96vw]"
            >
              <DialogTitle className="sr-only">Expanded image</DialogTitle>
              <img
                src={mediaUrl(h)}
                alt=""
                className="max-h-[88vh] w-auto max-w-[96vw] rounded-lg object-contain"
              />
            </DialogContent>
          </Dialog>
        ))}
      </div>
    );
  }

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
  onCountClick,
  disabled,
  active,
  filled,
  color = "bone",
  alwaysShowCount,
}: {
  icon: LucideIcon;
  label: number;
  onClick?: () => void;
  onCountClick?: () => void; // clicking the count opens the liked-by/reposted-by list
  disabled?: boolean;
  active?: boolean;
  filled?: boolean;
  color?: "seal" | "brass" | "bone";
  alwaysShowCount?: boolean; // render the number even when it's 0 (timeline reply/like/repost)
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
    <div className={`flex items-center gap-1.5 text-xs tabular-nums ${activeCls}`}>
      <button onClick={onClick} disabled={disabled} className={`transition disabled:opacity-50 ${hover}`}>
        <Icon size={17} strokeWidth={2} fill={filled ? "currentColor" : "none"} />
      </button>
      {(alwaysShowCount || label > 0) &&
        (onCountClick && label > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCountClick();
            }}
            className={`transition hover:underline ${hover}`}
          >
            {label}
          </button>
        ) : (
          <span>{label}</span>
        ))}
    </div>
  );
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Linkify @handle mentions (→ profile links, resolved against the address→handle
// map) and URLs (→ new-tab links). stopPropagation so a link/mention click doesn't
// also open the post thread.
function renderText(
  text: string,
  handles: Handles | undefined,
  onOpenProfile?: (a: `0x${string}`) => void,
  onOpenTag?: (tag: string) => void,
) {
  const rev = new Map<string, string>();
  if (handles) for (const [addr, h] of handles) if (h) rev.set(h.toLowerCase(), addr);
  return tokenize(text).map((tok, i) => {
    if (tok.type === "mention") {
      const addr = rev.get(tok.handle.toLowerCase());
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
            @{tok.handle}
          </button>
        );
      }
      return `@${tok.handle}`;
    }
    if (tok.type === "hashtag") {
      return (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onOpenTag?.(tok.tag);
          }}
          className="text-brass hover:underline"
        >
          #{tok.tag}
        </button>
      );
    }
    if (tok.type === "url") {
      return (
        <a
          key={i}
          href={tok.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={(e) => e.stopPropagation()}
          className="break-words text-brass hover:underline"
        >
          {tok.href}
        </a>
      );
    }
    return tok.value;
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
