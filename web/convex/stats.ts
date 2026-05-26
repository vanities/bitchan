import { query } from "./_generated/server";
import { v } from "convex/values";

/// Indexed totals for the republic panel. Counts are small at this scale; if the
/// board grows this should move to a maintained counter doc.
export const stats = query({
  args: {},
  returns: v.object({ posts: v.number(), accounts: v.number() }),
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    const accounts = await ctx.db.query("accounts").collect();
    return { posts: posts.length, accounts: accounts.length };
  },
});
