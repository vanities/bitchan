import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Galleries map a manifest hash (the on-chain mediaHash of a multi-image post) to
// its ordered member image hashes. Content-addressed + idempotent: the hash is
// sha256 of the image list, so re-recording the same set is a no-op. The member
// images are normal media rows (already NSFW-screened on upload).
export const record = mutation({
  args: { hash: v.string(), images: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { hash, images }) => {
    const h = hash.toLowerCase();
    const existing = await ctx.db
      .query("galleries")
      .withIndex("by_hash", (q) => q.eq("hash", h))
      .unique();
    if (!existing) await ctx.db.insert("galleries", { hash: h, images, createdAt: Date.now() });
    return null;
  },
});

export const get = query({
  args: { hash: v.string() },
  returns: v.union(v.object({ images: v.array(v.string()) }), v.null()),
  handler: async (ctx, { hash }) => {
    const g = await ctx.db
      .query("galleries")
      .withIndex("by_hash", (q) => q.eq("hash", hash.toLowerCase()))
      .unique();
    return g ? { images: g.images } : null;
  },
});
