import { useState } from "react";
import type { TimelinePost, Handles } from "../lib/useTimeline";
import { Feed, Notice } from "./Feed";

export function SearchView({
  posts,
  handles,
  onReply,
  onOpenProfile,
  onOpenPost,
  onQuote,
  loading,
  error,
}: {
  posts: TimelinePost[];
  handles: Handles;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
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
      {term && (
        <p className="px-4 py-2 font-mono text-xs text-bone-dim">
          {results.length} result{results.length === 1 ? "" : "s"} for "{q.trim()}"
        </p>
      )}
      <Feed
        posts={results}
        handles={handles}
        onReply={onReply}
        onOpenProfile={onOpenProfile}
        onOpenPost={onOpenPost}
        onQuote={onQuote}
        loading={loading}
        error={error}
        empty={<Notice>No posts match your search.</Notice>}
      />
    </div>
  );
}
