// Detects embeddable video links (YouTube / Vimeo) in post text. Pure +
// unit-tested. Client-only: IDs are parsed from the URL — no API calls.
export type Embed = { kind: "youtube"; id: string } | { kind: "vimeo"; id: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseEmbed(rawUrl: string): Embed | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YT_ID.test(id) ? { kind: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v") ?? "";
      return YT_ID.test(id) ? { kind: "youtube", id } : null;
    }
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return { kind: "youtube", id: m[1] };
  }
  if (host === "vimeo.com") {
    const m = url.pathname.match(/^\/(\d{6,})/);
    if (m) return { kind: "vimeo", id: m[1] };
  }
  if (host === "player.vimeo.com") {
    const m = url.pathname.match(/^\/video\/(\d{6,})/);
    if (m) return { kind: "vimeo", id: m[1] };
  }
  return null;
}

/// The first embeddable link in some text, or null. Used to show one inline
/// player per post (not a wall of iframes).
export function firstEmbed(text: string): Embed | null {
  const urls = text.match(/https?:\/\/[^\s<]+/g);
  if (!urls) return null;
  for (const u of urls) {
    const embed = parseEmbed(u.replace(/[.,!?;:)\]}'"»]+$/, ""));
    if (embed) return embed;
  }
  return null;
}
