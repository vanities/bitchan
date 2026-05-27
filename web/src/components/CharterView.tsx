import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Notice } from "./Feed";

type DocEntry = { file: string; slug: string; title: string };

// Renders the project's living documents (copied into /public/docs at build by
// scripts/sync-docs.mjs) so anyone can read the charter/whitepaper/etc. in-app.
// Relative .md links navigate between docs without leaving the SPA.
export function CharterView({ slug, onOpenDoc }: { slug: string | null; onOpenDoc: (slug: string) => void }) {
  const [index, setIndex] = useState<DocEntry[] | null>(null);
  const [content, setContent] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch("/docs/index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);

  const active = slug ?? index?.[0]?.slug ?? null;

  useEffect(() => {
    if (!active) return;
    setContent(undefined);
    fetch(`/docs/${active}.md`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not found"))))
      .then(setContent)
      .catch(() => setContent(null));
  }, [active]);

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
        {(index ?? []).map((d) => (
          <button
            key={d.slug}
            onClick={() => onOpenDoc(d.slug)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              d.slug === active ? "bg-seal text-white" : "text-bone-dim hover:bg-ink-soft hover:text-bone"
            }`}
          >
            {d.title}
          </button>
        ))}
      </div>

      {content === undefined ? (
        <Notice>reading the record…</Notice>
      ) : content === null ? (
        <Notice>Document not found.</Notice>
      ) : (
        <article className="prose prose-invert max-w-none px-4 py-5 prose-headings:font-display prose-headings:tracking-tight prose-a:text-brass prose-a:no-underline hover:prose-a:underline prose-code:text-brass prose-code:before:content-none prose-code:after:content-none prose-th:text-bone prose-hr:border-line">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => {
                // Relative links to another doc → navigate in-app instead of away.
                if (href && /\.md(#|$)/i.test(href)) {
                  const target = href
                    .replace(/^.*\//, "")
                    .replace(/\.md.*$/i, "")
                    .toUpperCase();
                  return (
                    <button onClick={() => onOpenDoc(target)} className="text-brass hover:underline">
                      {children}
                    </button>
                  );
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                );
              },
            }}
          >
            {content}
          </Markdown>
        </article>
      )}
    </div>
  );
}
