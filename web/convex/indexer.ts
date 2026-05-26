import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createPublicClient, http, parseAbiItem } from "viem";

// The events we materialize. Engagement (likes/reposts/follows) is gasless and
// lives in `reactions`, not here.
const POSTED = parseAbiItem(
  "event Posted(uint256 indexed id, address indexed author, uint256 indexed parentId, uint256 quotedId, bytes32 mediaHash, string text, uint256 createdAt)",
);
const HIDDEN = parseAbiItem("event Hidden(uint256 indexed postId, address indexed by, string reason)");
const UNHIDDEN = parseAbiItem("event Unhidden(uint256 indexed postId, address indexed by)");
const HANDLE_SET = parseAbiItem("event HandleSet(address indexed account, string handle)");

const CHUNK = 4000n;

function chainId(): number {
  return Number(process.env.CHAIN_ID ?? "11155111");
}

export const getCursor = internalQuery({
  args: {},
  returns: v.union(v.number(), v.null()),
  handler: async (ctx) => {
    const c = await ctx.db
      .query("indexerCursor")
      .withIndex("by_chainId", (q) => q.eq("chainId", chainId()))
      .unique();
    return c ? c.lastBlock : null;
  },
});

export const setCursor = internalMutation({
  args: { block: v.number() },
  returns: v.null(),
  handler: async (ctx, { block }) => {
    const id = chainId();
    const c = await ctx.db
      .query("indexerCursor")
      .withIndex("by_chainId", (q) => q.eq("chainId", id))
      .unique();
    if (c) await ctx.db.patch(c._id, { lastBlock: block });
    else await ctx.db.insert("indexerCursor", { chainId: id, lastBlock: block });
    return null;
  },
});

/// Poll the chain for new events and materialize them. Scheduled by crons.ts.
export const poll = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rpc = process.env.RPC_URL;
    const address = process.env.BITCHAN_ADDRESS as `0x${string}` | undefined;
    if (!rpc || !address) {
      console.error("indexer.poll: set RPC_URL and BITCHAN_ADDRESS via `convex env set`");
      return null;
    }
    const start = BigInt(process.env.INDEX_START_BLOCK ?? "0");
    const client = createPublicClient({ transport: http(rpc) });
    const latest = await client.getBlockNumber();

    const cursor = await ctx.runQuery(internal.indexer.getCursor, {});
    let from = cursor === null ? start : BigInt(cursor) + 1n;
    if (from > latest) return null;
    const to = from + CHUNK > latest ? latest : from + CHUNK;

    const logs = await client.getLogs({
      address,
      events: [POSTED, HIDDEN, UNHIDDEN, HANDLE_SET],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      const a = log.args as Record<string, unknown>;
      switch (log.eventName) {
        case "Posted": {
          const author = (a.author as string).toLowerCase();
          await ctx.runMutation(internal.accounts.upsertAccount, {
            address: author,
            firstSeenAt: Number(a.createdAt),
          });
          await ctx.runMutation(internal.posts.upsertPost, {
            onchainId: (a.id as bigint).toString(),
            author,
            parentId: (a.parentId as bigint).toString(),
            quotedId: (a.quotedId as bigint).toString(),
            mediaHash: a.mediaHash as string,
            text: a.text as string,
            createdAt: Number(a.createdAt),
          });
          break;
        }
        case "Hidden":
          await ctx.runMutation(internal.posts.setHidden, {
            onchainId: (a.postId as bigint).toString(),
            hidden: true,
            reason: a.reason as string,
            by: (a.by as string).toLowerCase(),
          });
          break;
        case "Unhidden":
          await ctx.runMutation(internal.posts.setHidden, {
            onchainId: (a.postId as bigint).toString(),
            hidden: false,
          });
          break;
        case "HandleSet":
          await ctx.runMutation(internal.accounts.upsertAccount, {
            address: (a.account as string).toLowerCase(),
            handle: a.handle as string,
            firstSeenAt: 0,
          });
          break;
      }
    }

    await ctx.runMutation(internal.indexer.setCursor, { block: Number(to) });
    return null;
  },
});
