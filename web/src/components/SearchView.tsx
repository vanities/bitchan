import { useMemo, useState } from "react";
import type { TimelinePost, Handles } from "../lib/useTimeline";
import { topHashtags } from "../lib/links";
import { Feed, Notice } from "./Feed";

export function SearchView({
  posts,
  handles,
  onReply,
  onOpenProfile,
  onOpenPost,
  onOpenTag,
  onQuote,
  loading,
  error,
}: {
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
  onOpenTag?: (tag: string) => void;
  onQuote?: (post: TimelinePost) => void;
  loading?: boolean;
  error?: unknown;
}) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const results = term
    ? posts.filter(
        (p) =>
          p.text.toLowerCase().includes(term) ||
          (handles.get(p.author.toLowerCase()) ?? "").toLowerCase().includes(term),
      )
    : posts;
  const trends = useMemo(() => topHashtags(posts.map((p) => p.text)), [posts]);
  // So a reply in the results shows the original it answers (parent may be outside results).
  const postsById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);

  return (
    <div>
      <div className="border-b border-line p-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search posts and citizens…"
          className="w-full rounded-md border border-line bg-ink-soft px-4 py-2.5 text-sm placeholder:text-bone-dim focus:border-brass focus:outline-none"
        />
      </div>

      {!term && trends.length > 0 && (
        <div className="border-b border-line px-4 py-3">
          <p className="label-civic mb-2 text-[10px] text-bone-dim">trending</p>
          <div className="flex flex-wrap gap-2">
            {trends.map((t) => (
              <button
                key={t.tag}
                onClick={() => onOpenTag?.(t.tag)}
                className="rounded-full border border-line bg-ink-soft px-3 py-1 text-sm text-brass transition hover:border-brass/50"
              >
                #{t.tag} <span className="text-bone-dim">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {term && (
        <p className="px-4 py-2 font-mono text-xs text-bone-dim">
          {results.length} result{results.length === 1 ? "" : "s"} for "{q.trim()}"
        </p>
      )}
      <Feed
        posts={results}
        showReplyContext
        lookup={postsById}
        handles={handles}
        onReply={onReply}
        onOpenProfile={onOpenProfile}
        onOpenPost={onOpenPost}
        onOpenTag={onOpenTag}
        onQuote={onQuote}
        loading={loading}
        error={error}
        empty={<Notice>No posts match your search.</Notice>}
      />
    </div>
  );
}
