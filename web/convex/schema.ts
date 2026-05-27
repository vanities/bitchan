import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The off-chain read model + gasless engagement, on Convex (replaces the Ponder
// indexer + the Bun engagement server). A cron polls the chain for events and
// materializes `posts`/`accounts`; reactions are signed messages verified server-side.
export default defineSchema({
  accounts: defineTable({
    address: v.string(), // lowercased
    handle: v.optional(v.string()),
    avatar: v.optional(v.string()), // media hash (off-chain, set via a signed mutation)
    bio: v.optional(v.string()), // off-chain, signed
    banner: v.optional(v.string()), // media hash, off-chain, signed
    website: v.optional(v.string()), // off-chain, signed
    pinnedPostId: v.optional(v.string()), // post id pinned to the profile, off-chain, signed
    firstSeenAt: v.number(),
  }).index("by_address", ["address"]),

  posts: defineTable({
    onchainId: v.string(), // on-chain post id
    author: v.string(),
    parentId: v.string(), // "0" = top-level
    quotedId: v.string(),
    mediaHash: v.string(),
    text: v.string(),
    createdAt: v.number(),
    hidden: v.boolean(),
    hiddenReason: v.optional(v.string()),
    hiddenBy: v.optional(v.string()),
    likeCount: v.number(),
    repostCount: v.number(),
    replyCount: v.number(),
  })
    .index("by_onchainId", ["onchainId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_author", ["author"]),

  // gasless engagement (EIP-712 signed): like / repost / follow
  reactions: defineTable({
    kind: v.union(v.literal("like"), v.literal("repost"), v.literal("follow")),
    account: v.string(), // lowercased signer
    target: v.string(), // postId (like/repost) or address (follow), lowercased
    active: v.boolean(),
    at: v.optional(v.number()), // last write time (ms) — for the notifications feed
  })
    .index("by_account_kind_target", ["account", "kind", "target"])
    .index("by_kind_target", ["kind", "target"]),

  // indexer progress: last block scanned per chain
  indexerCursor: defineTable({
    chainId: v.number(),
    lastBlock: v.number(),
  }).index("by_chainId", ["chainId"]),

  // Citizenship census — indexed from CitizenshipClaimed / InviteRedeemed.
  citizens: defineTable({
    address: v.string(),
    via: v.union(v.literal("claim"), v.literal("invite")),
    invitedBy: v.optional(v.string()),
    at: v.number(),
  }).index("by_address", ["address"]),

  // Chronological governance log — the transparency feed (the product, not an admin panel).
  // `at` is index time (≈ block time for live events, since the cron runs every 30s).
  govLog: defineTable({
    kind: v.string(), // citizen | president | treasury | moderation | founding | param | slash | wiring
    actor: v.optional(v.string()),
    summary: v.string(),
    blockNumber: v.number(),
    at: v.number(),
  }).index("by_at", ["at"]),

  // Multi-image posts without a contract change: the on-chain mediaHash is the
  // sha256 of a manifest (the ordered list of image hashes). Each image is a
  // normal (screened) media row; this table maps the manifest hash → its images.
  galleries: defineTable({
    hash: v.string(), // "0x" + sha256(JSON.stringify(images)) — the on-chain mediaHash
    images: v.array(v.string()), // member media hashes, in order
    createdAt: v.number(),
  }).index("by_hash", ["hash"]),

  // Media: content-addressed by sha256 (= the on-chain bytes32 mediaHash). Bytes
  // live in Convex file storage (deletable, so illegal content can be taken down —
  // see [[bitchan-convex-backend]]); screened by an NSFW check before storage.
  media: defineTable({
    hash: v.string(), // "0x" + sha256(content) hex — matches the on-chain mediaHash
    storageId: v.id("_storage"),
    mime: v.string(),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_hash", ["hash"]),

  // Fixed-window rate limiting (one row per key, e.g. "upload:<address>"). Bounds
  // abuse of the expensive authenticated actions; see convex/rateLimit.ts.
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(), // ms
    count: v.number(),
  }).index("by_key", ["key"]),
});
