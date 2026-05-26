import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/// Upsert an account (first-seen on a Posted event, or a handle from HandleSet).
export const upsertAccount = internalMutation({
  args: { address: v.string(), handle: v.optional(v.string()), firstSeenAt: v.number() },
  returns: v.null(),
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_address", (q) => q.eq("address", a.address))
      .unique();
    if (!existing) {
      await ctx.db.insert("accounts", { address: a.address, handle: a.handle, firstSeenAt: a.firstSeenAt });
    } else if (a.handle !== undefined) {
      await ctx.db.patch(existing._id, { handle: a.handle });
    }
    return null;
  },
});

/// All accounts → used by the client to build an address→handle map.
export const list = query({
  args: {},
  returns: v.array(v.object({ address: v.string(), handle: v.union(v.string(), v.null()) })),
  handler: async (ctx) => {
    const rows = await ctx.db.query("accounts").take(1000);
    return rows.map((r) => ({ address: r.address, handle: r.handle ?? null }));
  },
});
