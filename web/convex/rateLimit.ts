import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Generic fixed-window rate limiter. One row per `key` (e.g. "upload:<address>");
// the window resets lazily on the first call after it lapses. Throws when a key
// exceeds `max` calls within `windowMs`. Fixed-window (not sliding) — cheap, bounded
// storage, and good enough for anti-abuse (a boundary burst is acceptable here).
export const consume = internalMutation({
  args: { key: v.string(), max: v.number(), windowMs: v.number() },
  returns: v.null(),
  handler: async (ctx, { key, max, windowMs }) => {
    const now = Date.now();
    const row = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!row || now - row.windowStart >= windowMs) {
      if (row) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
      else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
      return null;
    }

    if (row.count >= max) {
      throw new Error("rate limit exceeded — slow down");
    }
    await ctx.db.patch(row._id, { count: row.count + 1 });
    return null;
  },
});
