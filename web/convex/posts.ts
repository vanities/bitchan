import { internalMutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
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

/// A single post by its on-chain id — used by the OG/link-preview function.
export const getById = query({
  args: { id: v.string() },
  returns: v.union(v.object(postShape), v.null()),
  handler: async (ctx, { id }) => {
    const p = await ctx.db
      .query("posts")
      .withIndex("by_onchainId", (q) => q.eq("onchainId", id))
      .unique();
    if (!p) return null;
    return {
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
    };
  },
});

/// The timeline read model — newest first, paginated (infinite scroll).
export const timeline = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query("posts")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: result.page.map((p) => ({
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
      })),
    };
  },
});
