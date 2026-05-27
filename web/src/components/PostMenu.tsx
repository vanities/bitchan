import { useState } from "react";
import { Bookmark, Copy, EyeOff, MoreHorizontal, Ban, Pin } from "lucide-react";
import { togglePref, usePref } from "../lib/prefs";

// Per-post overflow menu: bookmark, mute/block the author (viewer-local), pin (own
// posts), copy a shareable link. A click-outside backdrop closes it; all clicks
// stopPropagation so they don't also open the thread.
export function PostMenu({
  postId,
  author,
  handle,
  onPin,
  pinned,
}: {
  postId: string;
  author: string;
  handle?: string | null;
  onPin?: () => void; // present only on your own posts
  pinned?: boolean; // is this the viewer's currently-pinned post (profile view)
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { has: hasBookmark } = usePref("bookmarks");
  const { has: hasMute } = usePref("muted");
  const { has: hasBlock } = usePref("blocked");
  const bookmarked = hasBookmark(postId);
  const who = handle ? `@${handle}` : "this account";

  function copyLink() {
    navigator.clipboard?.writeText(`${location.origin}/post/${postId}`).then(
      () => {
        setCopied(true);
        // Show "Copied!" briefly, then close the menu.
        setTimeout(() => {
          setOpen(false);
          setCopied(false);
        }, 900);
      },
      () => {},
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="more"
        className="rounded-full p-1 text-bone-dim transition hover:bg-ink-soft hover:text-bone"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-7 z-20 w-48 overflow-hidden rounded-lg border border-line bg-ink-soft py-1 text-sm shadow-xl"
          >
            <Item
              icon={Bookmark}
              filled={bookmarked}
              onClick={() => {
                togglePref("bookmarks", postId);
                setOpen(false);
              }}
            >
              {bookmarked ? "Remove bookmark" : "Bookmark"}
            </Item>
            {onPin && (
              <Item
                icon={Pin}
                filled={pinned}
                onClick={() => {
                  onPin();
                  setOpen(false);
                }}
              >
                {pinned ? "Unpin from profile" : "Pin to profile"}
              </Item>
            )}
            <Item
              icon={EyeOff}
              onClick={() => {
                togglePref("muted", author);
                setOpen(false);
              }}
            >
              {hasMute(author) ? `Unmute ${who}` : `Mute ${who}`}
            </Item>
            <Item
              icon={Ban}
              danger
              onClick={() => {
                togglePref("blocked", author);
                setOpen(false);
              }}
            >
              {hasBlock(author) ? `Unblock ${who}` : `Block ${who}`}
            </Item>
            <Item icon={Copy} onClick={copyLink}>
              {copied ? "Copied!" : "Copy link"}
            </Item>
          </div>
        </>
      )}
    </div>
  );
}

function Item({
  icon: Icon,
  children,
  onClick,
  danger,
  filled,
}: {
  icon: typeof Copy;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  filled?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-ink ${
        danger ? "text-seal" : "text-bone"
      }`}
    >
      <Icon size={15} fill={filled ? "currentColor" : "none"} />
      {children}
    </button>
  );
}
