"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyTypedData, type Hex } from "viem";

// Set an off-chain profile (bio/banner/website). Node runtime because viem's
// verifyTypedData uses a dynamic import. The owner signs the fields so only they
// can edit their own profile. Mirrors avatar.ts.
const types = {
  Profile: [
    { name: "bio", type: "string" },
    { name: "banner", type: "string" },
    { name: "website", type: "string" },
  ],
} as const;

const pinTypes = { Pin: [{ name: "postId", type: "string" }] } as const;

export const set = action({
  args: {
    address: v.string(),
    bio: v.string(),
    banner: v.string(),
    website: v.string(),
    signature: v.string(),
  },
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
        primaryType: "Profile",
        message: { bio: a.bio, banner: a.banner, website: a.website },
        signature: a.signature as Hex,
      });
    } catch (e) {
      console.error("[profile] verify threw", e);
    }
    if (!valid) throw new Error("invalid signature");
    await ctx.runMutation(internal.accounts.recordProfile, {
      address: a.address.toLowerCase(),
      bio: a.bio,
      banner: a.banner,
      website: a.website,
    });
    return null;
  },
});

// Pin (or unpin, with postId="") a post to your profile.
export const pin = action({
  args: { address: v.string(), postId: v.string(), signature: v.string() },
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
        types: pinTypes,
        primaryType: "Pin",
        message: { postId: a.postId },
        signature: a.signature as Hex,
      });
    } catch (e) {
      console.error("[pin] verify threw", e);
    }
    if (!valid) throw new Error("invalid signature");
    await ctx.runMutation(internal.accounts.recordPin, {
      address: a.address.toLowerCase(),
      postId: a.postId,
    });
    return null;
  },
});
