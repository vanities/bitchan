import { onchainTable } from "ponder";

export const account = onchainTable("account", (t) => ({
  address: t.hex().primaryKey(),
  handle: t.text(), // null = anonymous
  firstSeenAt: t.bigint().notNull(),
}));

export const post = onchainTable("post", (t) => ({
  id: t.bigint().primaryKey(), // on-chain post id
  author: t.hex().notNull(),
  parentId: t.bigint().notNull(), // 0 = top-level
  quotedId: t.bigint().notNull(), // 0 = none
  mediaHash: t.hex().notNull(), // 0x00..0 = none; otherwise Arweave TXID
  text: t.text().notNull(),
  createdAt: t.bigint().notNull(),
  hidden: t.boolean().notNull(),
  hiddenReason: t.text(),
  hiddenBy: t.hex(),
  likeCount: t.integer().notNull(),
  repostCount: t.integer().notNull(),
  replyCount: t.integer().notNull(),
  txHash: t.hex().notNull(),
}));

export const follow = onchainTable("follow", (t) => ({
  id: t.text().primaryKey(), // `${follower}-${target}`
  follower: t.hex().notNull(),
  target: t.hex().notNull(),
  createdAt: t.bigint().notNull(),
}));

export const like = onchainTable("like", (t) => ({
  id: t.text().primaryKey(), // `${postId}-${account}`
  postId: t.bigint().notNull(),
  account: t.hex().notNull(),
  createdAt: t.bigint().notNull(),
}));

export const repost = onchainTable("repost", (t) => ({
  id: t.text().primaryKey(), // `${postId}-${account}`
  postId: t.bigint().notNull(),
  account: t.hex().notNull(),
  createdAt: t.bigint().notNull(),
}));
