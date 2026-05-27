// Tokenizes post text into plain runs, @mentions, and URLs so the renderer can
// linkify both. Pure + unit-tested. The mention rule mirrors lib/mentions.ts
// (negative lookbehind so an @ inside a word — e.g. a@b.com — is not a mention).
export type TextToken =
  | { type: "text"; value: string }
  | { type: "mention"; handle: string } // without the leading @
  | { type: "hashtag"; tag: string } // without the leading #
  | { type: "url"; href: string };

const TOKEN_RE =
  /(?<![A-Za-z0-9_])@(?<mention>[A-Za-z0-9_]{1,32})|(?<![A-Za-z0-9_])#(?<tag>[A-Za-z0-9_]{1,50})|(?<url>https?:\/\/[^\s<]+)/g;
// Punctuation that usually ends a sentence rather than belonging to the URL.
const TRAILING = /[.,!?;:)\]}'"»]+$/;

export function tokenize(text: string): TextToken[] {
  const out: TextToken[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0;
    const g = m.groups ?? {};
    if (i > last) out.push({ type: "text", value: text.slice(last, i) });
    if (g.mention !== undefined) {
      out.push({ type: "mention", handle: g.mention });
    } else if (g.tag !== undefined) {
      out.push({ type: "hashtag", tag: g.tag });
    } else if (g.url) {
      let href = g.url;
      const t = href.match(TRAILING);
      if (t) {
        href = href.slice(0, href.length - t[0].length);
        out.push({ type: "url", href });
        out.push({ type: "text", value: t[0] });
      } else {
        out.push({ type: "url", href });
      }
    }
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/// Top hashtags (lowercased) across some posts, most-used first — for "trending".
export function topHashtags(texts: string[], limit = 8): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const seen = new Set<string>(); // count each tag once per post
    for (const tok of tokenize(text)) {
      if (tok.type === "hashtag") {
        const t = tok.tag.toLowerCase();
        if (!seen.has(t)) {
          seen.add(t);
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
