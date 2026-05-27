"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyActor } from "./lib/eip712";
import { manifestHash } from "./lib/gallery";

// EIP-712 payload the author signs to record a gallery. Must match the client
// (web/src/lib/gallery.ts).
const GALLERY_TYPES = {
  Gallery: [
    { name: "hash", type: "string" },
    { name: "images", type: "string[]" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

// Record a multi-image gallery (manifest hash → ordered member hashes). The public,
// authenticated entry point; the actual db write is the internal `galleries.insert`.
//
// Closes review finding #1 (was an unauthenticated public mutation that let anyone
// pre-poison or spam-fill gallery rows). Two gates:
//   1. integrity — hash must equal sha256(images), so a row can only ever bind the
//      canonical (hash → images) mapping the on-chain post commits to.
//   2. authorship — an EIP-712 signature from the post author (direct or via their
//      session delegate) over (hash, images).
export const record = action({
  args: {
    hash: v.string(),
    images: v.array(v.string()),
    address: v.string(),
    signature: v.string(),
    deadline: v.string(),
    delegate: v.optional(v.string()),
    expiry: v.optional(v.string()),
    delegationSig: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    const expected = await manifestHash(a.images);
    if (expected.toLowerCase() !== a.hash.toLowerCase()) {
      console.warn(`[gallery] reject: claimed hash ${a.hash} != manifest ${expected}`);
      throw new Error("gallery hash does not match its images");
    }

    const signer = await verifyActor({
      label: "gallery",
      address: a.address,
      types: GALLERY_TYPES,
      primaryType: "Gallery",
      message: { hash: a.hash, images: a.images, deadline: BigInt(a.deadline) },
      signature: a.signature,
      deadline: a.deadline,
      delegation: { delegate: a.delegate, expiry: a.expiry, delegationSig: a.delegationSig },
    });
    if (!signer) throw new Error("invalid signature");

    await ctx.runMutation(internal.galleries.insert, { hash: a.hash, images: a.images });
    console.log(`[gallery] recorded ${a.hash} (${a.images.length} images) by ${signer}`);
    return null;
  },
});
