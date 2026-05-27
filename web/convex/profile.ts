"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyActor } from "./lib/eip712";

// Set an off-chain profile (bio/banner/website) or pin a post. Node runtime because
// viem's verifyTypedData uses a dynamic import. The owner signs the fields (verified
// via the shared verifyActor) so only they can edit their own profile. Mirrors avatar.ts.
const types = {
  Profile: [
    { name: "bio", type: "string" },
    { name: "banner", type: "string" },
    { name: "website", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

const pinTypes = {
  Pin: [
    { name: "postId", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const set = action({
  args: {
    address: v.string(),
    bio: v.string(),
    banner: v.string(),
    website: v.string(),
    deadline: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    const signer = await verifyActor({
      label: "profile",
      address: a.address,
      types,
      primaryType: "Profile",
      message: { bio: a.bio, banner: a.banner, website: a.website, deadline: BigInt(a.deadline) },
      signature: a.signature,
      deadline: a.deadline,
    });
    if (!signer) throw new Error("invalid signature");
    await ctx.runMutation(internal.accounts.recordProfile, {
      address: signer,
      bio: a.bio,
      banner: a.banner,
      website: a.website,
    });
    return null;
  },
});

// Pin (or unpin, with postId="") a post to your profile.
export const pin = action({
  args: { address: v.string(), postId: v.string(), deadline: v.string(), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, a) => {
    const signer = await verifyActor({
      label: "pin",
      address: a.address,
      types: pinTypes,
      primaryType: "Pin",
      message: { postId: a.postId, deadline: BigInt(a.deadline) },
      signature: a.signature,
      deadline: a.deadline,
    });
    if (!signer) throw new Error("invalid signature");
    await ctx.runMutation(internal.accounts.recordPin, { address: signer, postId: a.postId });
    return null;
  },
});
