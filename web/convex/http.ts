import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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
    return new Response(blob, {
      headers: {
        "Content-Type": m.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }),
});

export default http;
