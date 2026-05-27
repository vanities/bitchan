import { AtSign, Heart, MessageCircle, Repeat2, UserPlus, type LucideIcon } from "lucide-react";
import type { Handles } from "../lib/useTimeline";
import { Notice } from "./Feed";

type Notif = {
  type: "reply" | "mention" | "follow" | "like" | "repost";
  from: string;
  postId: string | null;
  text: string;
  at: number;
};

const META: Record<Notif["type"], { Icon: LucideIcon; color: string; verb: string }> = {
  reply: { Icon: MessageCircle, color: "text-bone-dim", verb: "replied to you" },
  mention: { Icon: AtSign, color: "text-brass", verb: "mentioned you" },
  follow: { Icon: UserPlus, color: "text-brass", verb: "followed you" },
  like: { Icon: Heart, color: "text-seal", verb: "liked your post" },
  repost: { Icon: Repeat2, color: "text-brass", verb: "reposted your post" },
};

export function NotificationsView({
  items,
  handles,
  onOpenProfile,
  onOpenPostId,
  loading,
}: {
  items?: Notif[];
  handles: Handles;
  onOpenProfile?: (a: `0x${string}`) => void;
  onOpenPostId?: (id: string) => void;
  loading?: boolean;
}) {
  if (!items) return <Notice>{loading ? "loading…" : "Connect a wallet to see notifications."}</Notice>;
  if (items.length === 0) return <Notice>No notifications yet.</Notice>;
  return (
    <ul>
      {items.map((n, i) => {
        const name = handles.get(n.from.toLowerCase()) ?? short(n.from);
        const { Icon, color, verb } = META[n.type];
        return (
          <li key={i} className="flex items-start gap-3 border-b border-line px-4 py-3 transition hover:bg-ink-soft/40">
            <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} strokeWidth={2.2} fill={n.type === "like" ? "currentColor" : "none"} />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-bone">
                <button onClick={() => onOpenProfile?.(n.from as `0x${string}`)} className="font-semibold hover:underline">
                  {name}
                </button>
                <span className="text-bone-dim"> {verb}</span>
              </p>
              {n.text && (
                <button
                  onClick={() => n.postId && onOpenPostId?.(n.postId)}
                  className="mt-0.5 block w-full truncate text-left text-sm text-bone-dim transition hover:text-bone"
                >
                  {n.text}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
