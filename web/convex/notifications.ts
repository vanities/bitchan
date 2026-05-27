import { query } from "./_generated/server";
import { v } from "convex/values";

// Notifications for a viewer: replies to their posts, @mentions of their handle,
// new followers, and likes/reposts of their posts — merged + time-sorted. Posts
// carry createdAt (seconds); reactions carry `at` (ms). At larger scale this should
// move to a maintained per-user inbox; fine to compute on read at this size.
const notifType = v.union(
  v.literal("reply"),
  v.literal("mention"),
  v.literal("follow"),
  v.literal("like"),
  v.literal("repost"),
);

export const feed = query({
  args: { viewer: v.string(), handle: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      type: notifType,
      from: v.string(),
      postId: v.union(v.string(), v.null()),
      text: v.string(),
      at: v.number(),
    }),
  ),
  handler: async (ctx, { viewer, handle, limit }) => {
    const me = viewer.toLowerCase();
    const out: { type: string; from: string; postId: string | null; text: string; at: number }[] = [];

    const myPosts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("author", me))
      .collect();
    const myPostIds = new Set(myPosts.map((p) => p.onchainId));
    const textOf = new Map(myPosts.map((p) => [p.onchainId, p.text]));

    // Replies + @mentions: scan recent posts.
    const recent = await ctx.db.query("posts").withIndex("by_createdAt").order("desc").take(300);
    for (const p of recent) {
      if (p.author === me) continue;
      const at = p.createdAt * 1000;
      if (p.parentId !== "0" && myPostIds.has(p.parentId)) {
        out.push({ type: "reply", from: p.author, postId: p.onchainId, text: p.text, at });
      }
      if (handle && p.text.includes("@" + handle)) {
        out.push({ type: "mention", from: p.author, postId: p.onchainId, text: p.text, at });
      }
    }

    // New followers.
    const follows = await ctx.db
      .query("reactions")
      .withIndex("by_kind_target", (q) => q.eq("kind", "follow").eq("target", me))
      .collect();
    for (const r of follows) {
      if (r.active && r.account !== me) out.push({ type: "follow", from: r.account, postId: null, text: "", at: r.at ?? 0 });
    }

    // Likes/reposts of my posts.
    for (const pid of myPostIds) {
      for (const kind of ["like", "repost"] as const) {
        const rs = await ctx.db
          .query("reactions")
          .withIndex("by_kind_target", (q) => q.eq("kind", kind).eq("target", pid))
          .collect();
        for (const r of rs) {
          if (r.active && r.account !== me) {
            out.push({ type: kind, from: r.account, postId: pid, text: textOf.get(pid) ?? "", at: r.at ?? 0 });
          }
        }
      }
    }

    out.sort((a, b) => b.at - a.at);
    return out.slice(0, limit ?? 50) as {
      type: "reply" | "mention" | "follow" | "like" | "repost";
      from: string;
      postId: string | null;
      text: string;
      at: number;
    }[];
  },
});
