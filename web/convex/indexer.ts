import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createPublicClient, http, parseAbiItem, formatEther } from "viem";

// The events we materialize. Engagement (likes/reposts/follows) is gasless and
// lives in `reactions`, not here.
const POSTED = parseAbiItem(
  "event Posted(uint256 indexed id, address indexed author, uint256 indexed parentId, uint256 quotedId, bytes32 mediaHash, string text, uint256 createdAt)",
);
const HIDDEN = parseAbiItem("event Hidden(uint256 indexed postId, address indexed by, string reason)");
const UNHIDDEN = parseAbiItem("event Unhidden(uint256 indexed postId, address indexed by)");
const HANDLE_SET = parseAbiItem("event HandleSet(address indexed account, string handle)");

// Governance events (all emitted by the Republic contract). Election/recall/
// judiciary live on separate per-instance contracts — not indexed here yet.
const CITIZENSHIP_CLAIMED = parseAbiItem("event CitizenshipClaimed(address indexed who)");
const INVITE_REDEEMED = parseAbiItem(
  "event InviteRedeemed(address indexed who, address indexed inviter, bytes32 indexed code)",
);
const PRESIDENT_CHANGED = parseAbiItem("event PresidentChanged(address indexed newPresident)");
const TREASURY_WITHDRAWN = parseAbiItem("event TreasuryWithdrawn(address indexed to, uint256 amount)");
const DO_NOT_SERVED = parseAbiItem(
  "event DoNotServed(uint256 indexed postId, address indexed by, string reason, uint256 until)",
);
const FOUNDING_TRANSITIONED = parseAbiItem("event FoundingTransitioned(uint256 atCount, uint256 atTime)");
const POST_FEE_CHANGED = parseAbiItem("event PostFeeChanged(uint256 newFee)");
const CITIZENSHIP_COST_CHANGED = parseAbiItem("event CitizenshipCostChanged(uint256 newCost)");
const AGE_THRESHOLD_CHANGED = parseAbiItem("event AgeThresholdChanged(uint64 newThreshold)");
const SLASHED = parseAbiItem("event Slashed(address indexed who)");
const ELECTION_SET = parseAbiItem("event ElectionSet(address indexed election)");
const RECALL_SET = parseAbiItem("event RecallSet(address indexed recall)");

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const isZero = (a: string) => /^0x0+$/.test(a);

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
    const from = cursor === null ? start : BigInt(cursor) + 1n;
    if (from > latest) return null;
    const to = from + CHUNK > latest ? latest : from + CHUNK;

    const logs = await client.getLogs({
      address,
      events: [
        POSTED,
        HIDDEN,
        UNHIDDEN,
        HANDLE_SET,
        CITIZENSHIP_CLAIMED,
        INVITE_REDEEMED,
        PRESIDENT_CHANGED,
        TREASURY_WITHDRAWN,
        DO_NOT_SERVED,
        FOUNDING_TRANSITIONED,
        POST_FEE_CHANGED,
        CITIZENSHIP_COST_CHANGED,
        AGE_THRESHOLD_CHANGED,
        SLASHED,
        ELECTION_SET,
        RECALL_SET,
      ],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      const a = log.args as Record<string, unknown>;
      const blk = Number(log.blockNumber);
      const at = Date.now();
      const gov = (kind: string, summary: string, actor?: string) =>
        ctx.runMutation(internal.governance.appendLog, { kind, summary, actor, blockNumber: blk, at });
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
        case "CitizenshipClaimed": {
          const who = (a.who as string).toLowerCase();
          await ctx.runMutation(internal.governance.recordCitizen, { address: who, via: "claim", at });
          await gov("citizen", `${short(who)} claimed citizenship`, who);
          break;
        }
        case "InviteRedeemed": {
          const who = (a.who as string).toLowerCase();
          const inviter = (a.inviter as string).toLowerCase();
          await ctx.runMutation(internal.governance.recordCitizen, {
            address: who,
            via: "invite",
            invitedBy: inviter,
            at,
          });
          await gov("citizen", `${short(who)} joined via invite from ${short(inviter)}`, who);
          break;
        }
        case "PresidentChanged": {
          const p = (a.newPresident as string).toLowerCase();
          await gov(
            "president",
            isZero(p) ? "president removed" : `president set to ${short(p)}`,
            isZero(p) ? undefined : p,
          );
          break;
        }
        case "TreasuryWithdrawn": {
          const to = (a.to as string).toLowerCase();
          await gov("treasury", `withdrew ${formatEther(a.amount as bigint)} Ξ to ${short(to)}`, to);
          break;
        }
        case "DoNotServed": {
          const by = (a.by as string).toLowerCase();
          await gov(
            "moderation",
            `do-not-serve #${(a.postId as bigint).toString()}: ${a.reason as string}`,
            by,
          );
          break;
        }
        case "FoundingTransitioned":
          await gov("founding", `founding ended at ${(a.atCount as bigint).toString()} citizens`);
          break;
        case "PostFeeChanged":
          await gov("param", `post fee set to ${formatEther(a.newFee as bigint)} Ξ`);
          break;
        case "CitizenshipCostChanged":
          await gov("param", `citizenship cost set to ${formatEther(a.newCost as bigint)} Ξ`);
          break;
        case "AgeThresholdChanged":
          await gov("param", `age threshold set to ${(a.newThreshold as bigint).toString()}s`);
          break;
        case "Slashed": {
          const who = (a.who as string).toLowerCase();
          await gov("slash", `slashed ${short(who)}`, who);
          break;
        }
        case "ElectionSet":
          await gov("wiring", "election contract wired");
          break;
        case "RecallSet":
          await gov("wiring", "recall contract wired");
          break;
      }
    }

    await ctx.runMutation(internal.indexer.setCursor, { block: Number(to) });
    return null;
  },
});
