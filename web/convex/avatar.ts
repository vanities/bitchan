"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyActor } from "./lib/eip712";

// Set an off-chain avatar (a media hash) for your address. Node runtime because
// viem's verifyTypedData uses a dynamic import. The user signs the avatar hash
// (verified via the shared verifyActor) so only the owner can set their picture.
const types = {
  Avatar: [
    { name: "avatar", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const set = action({
  args: { address: v.string(), avatar: v.string(), deadline: v.string(), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, a) => {
    const signer = await verifyActor({
      label: "avatar",
      address: a.address,
      types,
      primaryType: "Avatar",
      message: { avatar: a.avatar, deadline: BigInt(a.deadline) },
      signature: a.signature,
      deadline: a.deadline,
    });
    if (!signer) throw new Error("invalid signature");
    await ctx.runMutation(internal.accounts.recordAvatar, { address: signer, avatar: a.avatar });
    return null;
  },
});
