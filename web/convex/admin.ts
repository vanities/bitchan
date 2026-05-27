import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Dev-only utility: wipe all indexed data so the indexer can re-materialize from
// a fresh contract deployment (post ids would otherwise collide by onchainId).
// internalMutation = callable only via the deploy key (`convex run`), never by clients.
export const reset = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const tables = ["posts", "accounts", "citizens", "govLog", "reactions", "media", "indexerCursor"] as const;
    let deleted = 0;
    for (const table of tables) {
      for (const row of await ctx.db.query(table).collect()) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
