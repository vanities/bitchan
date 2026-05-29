import { hasMedia, mediaUrl } from "../lib/media";

// Muted, on-brand palette for monogram avatars (federal navy, brass, slate, seal,
// pine, plum). Picked deterministically from the address so a given account always
// gets the same color everywhere (timeline, profile, thread).
const PALETTE = ["#3b4a6b", "#8a6d3b", "#46596b", "#7c3b3b", "#46624f", "#5a466b"];

export function avatarColor(address: string): string {
  let h = 0;
  const a = address.toLowerCase();
  for (let i = 2; i < a.length; i++) h = (h * 31 + a.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

/** Round avatar: the account's uploaded picture, else a monogram on a per-address color. */
export function Avatar({
  address,
  label,
  avatar,
  size = 40,
  onClick,
  title,
}: {
  address: string;
  label?: string | null; // display name (handle/ENS) — first letter is the monogram
  avatar?: string | null; // media hash, or null for the monogram fallback
  size?: number;
  onClick?: () => void;
  title?: string;
}) {
  const seed = label && label.trim() && label !== "anon" ? label.trim() : address.slice(2);
  const letter = seed[0]!.toUpperCase();
  const inner =
    avatar && hasMedia(avatar) ? (
      <img src={mediaUrl(avatar)} alt="" className="h-full w-full object-cover" />
    ) : (
      <span
        className="grid h-full w-full place-items-center font-bold leading-none text-white"
        style={{ backgroundColor: avatarColor(address), fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>
    );
  const className = "shrink-0 overflow-hidden rounded-full bg-ink-soft";
  const style = { width: size, height: size };
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${className} transition hover:opacity-90`}
      style={style}
    >
      {inner}
    </button>
  ) : (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}
