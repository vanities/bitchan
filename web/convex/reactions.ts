"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyActor } from "./lib/eip712";
import { kindValidator } from "./engagement";

// Node-runtime action: viem's verifyTypedData dynamically imports secp256k1, which
// the Convex runtime forbids — so EIP-712 verification (via the shared verifyActor)
// must happen here. Types/domain must match the frontend signer (web/src/lib/engagement.ts).
const types = {
  Reaction: [
    { name: "kind", type: "string" },
    { name: "target", type: "string" },
    { name: "active", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const react = action({
  args: {
    address: v.string(),
    kind: kindValidator,
    target: v.string(),
    active: v.boolean(),
    nonce: v.string(),
    deadline: v.string(),
    signature: v.string(),
    // Delegated path (optional): a session key signs the reaction, authorized by a
    // one-time Delegation the user signed.
    delegate: v.optional(v.string()),
    expiry: v.optional(v.string()),
    delegationSig: v.optional(v.string()),
  },
  returns: v.object({ signer: v.string(), kind: kindValidator, target: v.string(), active: v.boolean() }),
  handler: async (ctx, a) => {
    const signer = await verifyActor({
      label: "react",
      address: a.address,
      types,
      primaryType: "Reaction",
      message: {
        kind: a.kind,
        target: a.target,
        active: a.active,
        nonce: BigInt(a.nonce),
        deadline: BigInt(a.deadline),
      },
      signature: a.signature,
      deadline: a.deadline,
      delegation: { delegate: a.delegate, expiry: a.expiry, delegationSig: a.delegationSig },
    });
    if (!signer) throw new Error("invalid signature");

    const target = a.target.toLowerCase();
    await ctx.runMutation(internal.engagement.writeReaction, {
      account: signer,
      kind: a.kind,
      target,
      active: a.active,
    });
    return { signer, kind: a.kind, target, active: a.active };
  },
});
