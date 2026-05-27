import { internalMutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// Gasless engagement read-model + writer, ported from the Bun/Hono server.
// Signature verification lives in `reactions.ts` (a Node-runtime action) because
// viem's verifyTypedData uses a dynamic import that the Convex runtime forbids;
// that action verifies the EIP-712 message then calls `writeReaction` here.
export const kindValidator = v.union(v.literal("like"), v.literal("repost"), v.literal("follow"));

/// Toggle an already-verified reaction. Latest write wins (mirrors the old
/// server — the signature proved intent; no nonce ordering). account/target
/// are pre-lowercased by the caller.
export const writeReaction = internalMutation({
  args: { account: v.string(), kind: kindValidator, target: v.string(), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_account_kind_target", (q) =>
        q.eq("account", a.account).eq("kind", a.kind).eq("target", a.target),
      )
      .unique();
    if (existing) await ctx.db.patch(existing._id, { active: a.active });
    else await ctx.db.insert("reactions", { account: a.account, kind: a.kind, target: a.target, active: a.active });
    console.log(`[react] ${a.active ? "+" : "-"}${a.kind} ${a.target} by ${a.account}`);
    return null;
  },
});

async function countActive(
  ctx: QueryCtx,
  kind: "like" | "repost" | "follow",
  target: string,
): Promise<number> {
  const rows = await ctx.db
    .query("reactions")
    .withIndex("by_kind_target", (q) => q.eq("kind", kind).eq("target", target))
    .collect();
  return rows.filter((r) => r.active).length;
}

/// Like/repost counts + whether the viewer reacted, for a batch of post ids.
export const engagement = query({
  args: { postIds: v.array(v.string()), viewer: v.optional(v.string()) },
  returns: v.array(
    v.object({
      postId: v.string(),
      likes: v.number(),
      reposts: v.number(),
      likedByViewer: v.boolean(),
      repostedByViewer: v.boolean(),
    }),
  ),
  handler: async (ctx, { postIds, viewer }) => {
    const v0 = viewer ? viewer.toLowerCase() : "";
    const out = [];
    for (const id of postIds) {
      const target = id.toLowerCase();
      let likedByViewer = false;
      let repostedByViewer = false;
      if (v0) {
        const lk = await ctx.db
          .query("reactions")
          .withIndex("by_account_kind_target", (q) =>
            q.eq("account", v0).eq("kind", "like").eq("target", target),
          )
          .unique();
        const rp = await ctx.db
          .query("reactions")
          .withIndex("by_account_kind_target", (q) =>
            q.eq("account", v0).eq("kind", "repost").eq("target", target),
          )
          .unique();
        likedByViewer = !!lk?.active;
        repostedByViewer = !!rp?.active;
      }
      out.push({
        postId: id,
        likes: await countActive(ctx, "like", target),
        reposts: await countActive(ctx, "repost", target),
        likedByViewer,
        repostedByViewer,
      });
    }
    return out;
  },
});

/// The set of addresses an account follows.
export const following = query({
  args: { account: v.string() },
  returns: v.object({ following: v.array(v.string()) }),
  handler: async (ctx, { account }) => {
    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_account_kind_target", (q) => q.eq("account", account.toLowerCase()).eq("kind", "follow"))
      .collect();
    return { following: rows.filter((r) => r.active).map((r) => r.target) };
  },
});

/// The set of addresses that follow an account (reverse of following).
export const followers = query({
  args: { account: v.string() },
  returns: v.object({ followers: v.array(v.string()) }),
  handler: async (ctx, { account }) => {
    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_kind_target", (q) => q.eq("kind", "follow").eq("target", account.toLowerCase()))
      .collect();
    return { followers: rows.filter((r) => r.active).map((r) => r.account) };
  },
});
