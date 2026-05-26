import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// Media read-model + writer. Upload + NSFW screening happens in the Node action
// `mediaActions.upload`; this file is the Convex-runtime side (db + a public
// info query). Bytes are served by the HTTP action in `http.ts`.

/// Record a stored media item (idempotent on hash). Called by the upload action.
export const record = internalMutation({
  args: {
    hash: v.string(),
    storageId: v.id("_storage"),
    mime: v.string(),
    size: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("media")
      .withIndex("by_hash", (q) => q.eq("hash", a.hash))
      .unique();
    if (existing) {
      // Same content already stored — drop the duplicate blob we just created.
      await ctx.storage.delete(a.storageId);
      return null;
    }
    await ctx.db.insert("media", { ...a, createdAt: Date.now() });
    return null;
  },
});

/// storageId + mime for a hash — used by the HTTP route that serves bytes.
export const byHash = internalQuery({
  args: { hash: v.string() },
  returns: v.union(v.object({ storageId: v.id("_storage"), mime: v.string() }), v.null()),
  handler: async (ctx, { hash }) => {
    const m = await ctx.db
      .query("media")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .unique();
    return m ? { storageId: m.storageId, mime: m.mime } : null;
  },
});

/// mime + size for a hash — the client uses mime to pick <img> vs <video>.
export const info = query({
  args: { hash: v.string() },
  returns: v.union(v.object({ mime: v.string(), size: v.number() }), v.null()),
  handler: async (ctx, { hash }) => {
    const m = await ctx.db
      .query("media")
      .withIndex("by_hash", (q) => q.eq("hash", hash))
      .unique();
    return m ? { mime: m.mime, size: m.size } : null;
  },
});
