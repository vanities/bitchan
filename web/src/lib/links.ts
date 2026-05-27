// Tokenizes post text into plain runs, @mentions, and URLs so the renderer can
// linkify both. Pure + unit-tested. The mention rule mirrors lib/mentions.ts
// (negative lookbehind so an @ inside a word — e.g. a@b.com — is not a mention).
export type TextToken =
  | { type: "text"; value: string }
  | { type: "mention"; handle: string } // without the leading @
  | { type: "url"; href: string };

const TOKEN_RE = /(?<![A-Za-z0-9_])@([A-Za-z0-9_]{1,32})|(https?:\/\/[^\s<]+)/g;
// Punctuation that usually ends a sentence rather than belonging to the URL.
const TRAILING = /[.,!?;:)\]}'"»]+$/;

export function tokenize(text: string): TextToken[] {
  const out: TextToken[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "text", value: text.slice(last, i) });
    if (m[1] !== undefined) {
      out.push({ type: "mention", handle: m[1] });
    } else if (m[2]) {
      let href = m[2];
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
