// Pure helpers for @handle mentions in post text — shared by the renderer (PostCard)
// and unit tests. The negative lookbehind means an @ inside a word (e.g. an email
// like a@b.com) is not treated as a mention.
export const MENTION_SPLIT_RE = /(?<![A-Za-z0-9_])(@[A-Za-z0-9_]{1,32})/g;

/** Extract the handle tokens (without the leading @) mentioned in `text`. */
export function mentionTokens(text: string): string[] {
  return [...text.matchAll(/(?<![A-Za-z0-9_])@([A-Za-z0-9_]{1,32})/g)].map((m) => m[1]);
}
