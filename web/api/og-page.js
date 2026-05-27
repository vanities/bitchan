// Per-route link previews for the SPA. Vercel rewrites /post/:id and /@:handle to
// this function (see vercel.json); it reads the built index.html, swaps the OG
// marker block for route-specific <title>/<meta> tags, and returns the page.
// Real users still get the normal SPA (React boots from the same HTML); crawlers
// (Twitter/Discord/iMessage/Slack) read the injected tags. Everything is wrapped
// in try/catch and falls back to the site defaults — a preview must never 500.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// includeFiles (vercel.json) bundles dist/index.html next to the function. Read
// once at cold start — the asset hashes inside must match the deployed build.
const html = readFileSync(join(process.cwd(), "dist/index.html"), "utf8");
const OG_RE = /<!-- OG:start[\s\S]*?OG:end -->/;

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function block({ title, desc, image, url, type }) {
  return `<!-- OG:start (per-route) -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta property="og:site_name" content="bitchan" />
    <meta property="og:type" content="${esc(type)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${esc(image)}" />
  <!-- OG:end -->`;
}

let convex;
function client() {
  const url = process.env.VITE_CONVEX_URL;
  if (!url) return null;
  if (!convex) convex = new ConvexHttpClient(url);
  return convex;
}

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "bitchan.vercel.app";
  const base = `https://${host}`;
  const { type, id, handle } = req.query;

  let meta = {
    title: "bitchan — an on-chain republic",
    desc: "An on-chain social republic. Posts on Ethereum, gasless engagement, an elected on-chain government.",
    image: `${base}/api/og`,
    url: `${base}/`,
    type: "website",
  };

  try {
    const cx = client();
    if (cx && type === "post" && id) {
      const post = await cx.query(api.posts.getById, { id: String(id) });
      // Don't leak moderated content into previews — fall back to the default.
      if (post && !post.hidden) {
        const text = (post.text || "").trim() || "media post";
        const snippet = text.length > 70 ? `${text.slice(0, 70)}…` : text;
        meta = {
          title: `${snippet} · bitchan`,
          desc: text.slice(0, 200),
          image: `${base}/api/og?text=${encodeURIComponent(text.slice(0, 160))}`,
          url: `${base}/post/${encodeURIComponent(String(id))}`,
          type: "article",
        };
      }
    } else if (cx && type === "profile" && handle) {
      const acct = await cx.query(api.accounts.getByHandle, { handle: String(handle) });
      const name = acct?.handle ? `@${acct.handle}` : `@${handle}`;
      meta = {
        title: `${name} · bitchan`,
        desc: `${name} on bitchan — an on-chain social republic.`,
        image: `${base}/api/og?text=${encodeURIComponent(name)}`,
        url: `${base}/@${encodeURIComponent(String(handle))}`,
        type: "profile",
      };
    }
  } catch (err) {
    console.error("[og-page] convex lookup failed, serving defaults:", err);
  }

  const out = OG_RE.test(html)
    ? html.replace(OG_RE, block(meta))
    : html.replace("</head>", `${block(meta)}\n</head>`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(out);
}
