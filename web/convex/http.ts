import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { SERVABLE_IMAGE_MIMES } from "./lib/imageType";

const http = httpRouter();

// Serve media bytes at a stable, content-addressed URL: /media/<0x-sha256>.
// Keeps the client's mediaUrl() a plain sync string (no per-post query).
http.route({
  pathPrefix: "/media/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const hash = new URL(req.url).pathname.replace(/^\/media\//, "");
    const m = await ctx.runQuery(internal.media.byHash, { hash });
    if (!m) return new Response("not found", { status: 404 });
    const blob = await ctx.storage.get(m.storageId);
    if (!blob) return new Response("not found", { status: 404 });
    // Defense in depth: uploads now sniff + allowlist the MIME, but legacy rows
    // may carry an attacker-claimed type. Never echo a non-allowlisted MIME, and
    // pile on headers so a stray non-image can't execute script in our origin.
    const safeType = SERVABLE_IMAGE_MIMES.has(m.mime) ? m.mime : "application/octet-stream";
    return new Response(blob, {
      headers: {
        "Content-Type": safeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }),
});

export default http;
