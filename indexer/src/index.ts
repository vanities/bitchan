import { ponder } from "ponder:registry";
import { account, follow, like, post, repost } from "ponder:schema";

ponder.on("Bitchan:Posted", async ({ event, context }) => {
  const { id, author, parentId, quotedId, mediaHash, text, createdAt } = event.args;

  await context.db
    .insert(account)
    .values({ address: author, handle: null, firstSeenAt: event.block.timestamp })
    .onConflictDoNothing();

  await context.db.insert(post).values({
    id,
    author,
    parentId,
    quotedId,
    mediaHash,
    text,
    createdAt,
    hidden: false,
    hiddenReason: null,
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    txHash: event.transaction.hash,
  });

  if (parentId !== 0n) {
    const parent = await context.db.find(post, { id: parentId });
    if (parent) {
      await context.db.update(post, { id: parentId }).set({ replyCount: parent.replyCount + 1 });
    }
  }
});

ponder.on("Bitchan:HandleSet", async ({ event, context }) => {
  const { account: addr, handle } = event.args;
  await context.db
    .insert(account)
    .values({ address: addr, handle, firstSeenAt: event.block.timestamp })
    .onConflictDoUpdate(() => ({ handle }));
});

ponder.on("Bitchan:Liked", async ({ event, context }) => {
  const { postId, account: addr } = event.args;
  await context.db
    .insert(like)
    .values({ id: `${postId}-${addr}`, postId, account: addr, createdAt: event.block.timestamp })
    .onConflictDoNothing();
  const p = await context.db.find(post, { id: postId });
  if (p) await context.db.update(post, { id: postId }).set({ likeCount: p.likeCount + 1 });
});

ponder.on("Bitchan:Unliked", async ({ event, context }) => {
  const { postId, account: addr } = event.args;
  const existing = await context.db.find(like, { id: `${postId}-${addr}` });
  if (!existing) return;
  await context.db.delete(like, { id: `${postId}-${addr}` });
  const p = await context.db.find(post, { id: postId });
  if (p && p.likeCount > 0) {
    await context.db.update(post, { id: postId }).set({ likeCount: p.likeCount - 1 });
  }
});

ponder.on("Bitchan:Reposted", async ({ event, context }) => {
  const { postId, account: addr } = event.args;
  await context.db
    .insert(repost)
    .values({ id: `${postId}-${addr}`, postId, account: addr, createdAt: event.block.timestamp })
    .onConflictDoNothing();
  const p = await context.db.find(post, { id: postId });
  if (p) await context.db.update(post, { id: postId }).set({ repostCount: p.repostCount + 1 });
});

ponder.on("Bitchan:Followed", async ({ event, context }) => {
  const { follower, target } = event.args;
  await context.db
    .insert(follow)
    .values({
      id: `${follower}-${target}`,
      follower,
      target,
      createdAt: event.block.timestamp,
    })
    .onConflictDoNothing();
});

ponder.on("Bitchan:Unfollowed", async ({ event, context }) => {
  const { follower, target } = event.args;
  await context.db.delete(follow, { id: `${follower}-${target}` });
});

ponder.on("Bitchan:Hidden", async ({ event, context }) => {
  const { postId, reason } = event.args;
  const p = await context.db.find(post, { id: postId });
  if (p) {
    await context.db.update(post, { id: postId }).set({ hidden: true, hiddenReason: reason });
  }
});

ponder.on("Bitchan:Unhidden", async ({ event, context }) => {
  const { postId } = event.args;
  const p = await context.db.find(post, { id: postId });
  if (p) {
    await context.db.update(post, { id: postId }).set({ hidden: false, hiddenReason: null });
  }
});
