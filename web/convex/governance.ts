import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Governance read-model: a citizenship census + a chronological transparency log,
// materialized by the indexer from the Republic contract's governance events.
// Election/recall/judiciary live on separate per-instance contracts (not yet
// deployed on Sepolia) — indexing those is future work.

const viaValidator = v.union(v.literal("claim"), v.literal("invite"));

/// Record a citizen (idempotent on address). From CitizenshipClaimed / InviteRedeemed.
export const recordCitizen = internalMutation({
  args: { address: v.string(), via: viaValidator, invitedBy: v.optional(v.string()), at: v.number() },
  returns: v.null(),
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("citizens")
      .withIndex("by_address", (q) => q.eq("address", a.address))
      .unique();
    if (!existing) await ctx.db.insert("citizens", a);
    return null;
  },
});

/// Append a governance event to the transparency log.
export const appendLog = internalMutation({
  args: {
    kind: v.string(),
    actor: v.optional(v.string()),
    summary: v.string(),
    blockNumber: v.number(),
    at: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    await ctx.db.insert("govLog", a);
    return null;
  },
});

/// Recent governance activity, newest first — the transparency feed.
export const recent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      kind: v.string(),
      actor: v.union(v.string(), v.null()),
      summary: v.string(),
      blockNumber: v.number(),
      at: v.number(),
    }),
  ),
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("govLog").withIndex("by_at").order("desc").take(limit ?? 20);
    return rows.map((r) => ({
      kind: r.kind,
      actor: r.actor ?? null,
      summary: r.summary,
      blockNumber: r.blockNumber,
      at: r.at,
    }));
  },
});

/// Indexed citizenship census — count + most recent joiners.
export const census = query({
  args: {},
  returns: v.object({
    count: v.number(),
    recent: v.array(v.object({ address: v.string(), via: viaValidator, at: v.number() })),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("citizens").collect();
    const recent = [...all]
      .sort((a, b) => b.at - a.at)
      .slice(0, 10)
      .map((c) => ({ address: c.address, via: c.via, at: c.at }));
    return { count: all.length, recent };
  },
});
