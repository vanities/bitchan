"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyTypedData, type Hex } from "viem";
import { kindValidator } from "./engagement";

// Node-runtime action: viem's verifyTypedData dynamically imports secp256k1,
// which the Convex runtime forbids — so EIP-712 verification must happen here.
// Must match the frontend signer EXACTLY (domain + types).
const types = {
  Reaction: [
    { name: "kind", type: "string" },
    { name: "target", type: "string" },
    { name: "active", type: "bool" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const react = action({
  args: {
    address: v.string(),
    kind: kindValidator,
    target: v.string(),
    active: v.boolean(),
    nonce: v.string(),
    signature: v.string(),
  },
  returns: v.object({ signer: v.string(), kind: kindValidator, target: v.string(), active: v.boolean() }),
  handler: async (ctx, a) => {
    const domain = { name: "bitchan", version: "1", chainId: Number(process.env.CHAIN_ID ?? "31337") } as const;
    let valid = false;
    try {
      valid = await verifyTypedData({
        address: a.address as Hex,
        domain,
        types,
        primaryType: "Reaction",
        message: { kind: a.kind, target: a.target, active: a.active, nonce: BigInt(a.nonce) },
        signature: a.signature as Hex,
      });
    } catch (e) {
      console.error("[react] verify threw", e);
    }
    if (!valid) {
      console.warn(`[react] rejected bad signature: ${a.kind} ${a.target} by ${a.address}`);
      throw new Error("invalid signature");
    }

    const account = a.address.toLowerCase();
    const target = a.target.toLowerCase();
    await ctx.runMutation(internal.engagement.writeReaction, { account, kind: a.kind, target, active: a.active });
    return { signer: account, kind: a.kind, target, active: a.active };
  },
});
