import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

const postShape = {
  id: v.string(),
  author: v.string(),
  text: v.string(),
  mediaHash: v.string(),
  parentId: v.string(),
  quotedId: v.string(),
  likeCount: v.number(),
  repostCount: v.number(),
  replyCount: v.number(),
  hidden: v.boolean(),
  hiddenReason: v.union(v.string(), v.null()),
  hiddenBy: v.union(v.string(), v.null()),
  createdAt: v.number(),
};

/// Insert a post from a chain `Posted` event (idempotent on onchainId).
export const upsertPost = internalMutation({
  args: {
    onchainId: v.string(),
    author: v.string(),
    parentId: v.string(),
    quotedId: v.string(),
    mediaHash: v.string(),
    text: v.string(),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_onchainId", (q) => q.eq("onchainId", a.onchainId))
      .unique();
    if (existing) return null;
    await ctx.db.insert("posts", {
      ...a,
      hidden: false,
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
    });
    if (a.parentId !== "0") {
      const parent = await ctx.db
        .query("posts")
        .withIndex("by_onchainId", (q) => q.eq("onchainId", a.parentId))
        .unique();
      if (parent) await ctx.db.patch(parent._id, { replyCount: parent.replyCount + 1 });
    }
    return null;
  },
});

/// Apply a `Hidden`/`Unhidden` event.
export const setHidden = internalMutation({
  args: {
    onchainId: v.string(),
    hidden: v.boolean(),
    reason: v.optional(v.string()),
    by: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query("posts")
      .withIndex("by_onchainId", (q) => q.eq("onchainId", a.onchainId))
      .unique();
    if (p) {
      await ctx.db.patch(p._id, {
        hidden: a.hidden,
        hiddenReason: a.hidden ? a.reason : undefined,
        hiddenBy: a.hidden ? a.by : undefined,
      });
    }
    return null;
  },
});

/// The timeline read model — newest first.
export const timeline = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object(postShape)),
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("posts").withIndex("by_createdAt").order("desc").take(limit ?? 100);
    return rows.map((p) => ({
      id: p.onchainId,
      author: p.author,
      text: p.text,
      mediaHash: p.mediaHash,
      parentId: p.parentId,
      quotedId: p.quotedId,
      likeCount: p.likeCount,
      repostCount: p.repostCount,
      replyCount: p.replyCount,
      hidden: p.hidden,
      hiddenReason: p.hiddenReason ?? null,
      hiddenBy: p.hiddenBy ?? null,
      createdAt: p.createdAt,
    }));
  },
});
