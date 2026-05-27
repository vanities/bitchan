import { useState } from "react";
import { Play } from "lucide-react";
import type { Embed as EmbedT } from "../lib/embeds";

// Click-to-load video embed. We show a thumbnail/placeholder and only inject the
// iframe once the viewer clicks — so the page stays fast and YouTube/Vimeo can't
// set cookies or track viewers until they actually choose to watch.
export function Embed({ embed }: { embed: EmbedT }) {
  const [active, setActive] = useState(false);

  const src =
    embed.kind === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${embed.id}?autoplay=1`
      : `https://player.vimeo.com/video/${embed.id}?autoplay=1`;
  const thumb = embed.kind === "youtube" ? `https://i.ytimg.com/vi/${embed.id}/hqdefault.jpg` : null;

  if (active) {
    return (
      <div className="mt-2 aspect-video overflow-hidden rounded-xl border border-line">
        <iframe
          src={src}
          title={`${embed.kind} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setActive(true);
      }}
      aria-label={`Play ${embed.kind} video`}
      className="group relative mt-2 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-ink-soft"
    >
      {thumb && (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition group-hover:opacity-75"
        />
      )}
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-seal/90 text-white shadow-lg transition group-hover:scale-110">
        <Play size={28} fill="currentColor" className="ml-1" />
      </span>
      <span className="absolute bottom-2 left-2 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bone-dim">
        {embed.kind}
      </span>
    </button>
  );
}
