"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyTypedData, type Hex } from "viem";

// Set an off-chain avatar (a media hash) for your address. Node runtime because
// viem's verifyTypedData uses a dynamic import. The user signs the avatar hash so
// only the owner can set their own picture.
const types = {
  Avatar: [{ name: "avatar", type: "string" }],
} as const;

export const set = action({
  args: { address: v.string(), avatar: v.string(), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, a) => {
    const domain = {
      name: "bitchan",
      version: "1",
      chainId: Number(process.env.CHAIN_ID ?? "31337"),
    } as const;
    let valid = false;
    try {
      valid = await verifyTypedData({
        address: a.address as Hex,
        domain,
        types,
        primaryType: "Avatar",
        message: { avatar: a.avatar },
        signature: a.signature as Hex,
      });
    } catch (e) {
      console.error("[avatar] verify threw", e);
    }
    if (!valid) throw new Error("invalid signature");
    await ctx.runMutation(internal.accounts.recordAvatar, {
      address: a.address.toLowerCase(),
      avatar: a.avatar,
    });
    return null;
  },
});
