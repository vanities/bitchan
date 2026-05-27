/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { api } from "./_generated/api";
import schema from "./schema";
import { manifestHash } from "./lib/gallery";

// The backend binds every signing domain to this contract (verifyingContract) and
// reads it from BITCHAN_ADDRESS. Set it so signatures we craft here can match.
const VERIFYING_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
process.env.BITCHAN_ADDRESS = VERIFYING_CONTRACT;

const modules = import.meta.glob("./**/*.ts");
const GALLERY_TYPES = {
  Gallery: [
    { name: "hash", type: "string" },
    { name: "images", type: "string[]" },
    { name: "deadline", type: "uint256" },
  ],
} as const;
const IMAGES = ["0x" + "11".repeat(32)];
const FUTURE = () => Math.floor(Date.now() / 1000) + 600;

function acct() {
  return privateKeyToAccount(generatePrivateKey());
}

async function record(
  t: ReturnType<typeof convexTest>,
  author: ReturnType<typeof acct>,
  opts: { domain: Record<string, unknown>; deadline?: number },
) {
  const hash = await manifestHash(IMAGES);
  const deadline = opts.deadline ?? FUTURE();
  const signature = await author.signTypedData({
    domain: opts.domain as never,
    types: GALLERY_TYPES,
    primaryType: "Gallery",
    message: { hash, images: IMAGES, deadline: BigInt(deadline) } as never,
  });
  return t.action(api.galleryActions.record, {
    hash,
    images: IMAGES,
    address: author.address,
    signature,
    deadline: deadline.toString(),
  });
}

const goodDomain = { name: "bitchan", version: "1", chainId: 31337, verifyingContract: VERIFYING_CONTRACT };

describe("EIP-712 domain binding (verifyingContract) — finding #5a", () => {
  it("REJECTS a signature with NO verifyingContract (the cross-deployment replay vuln)", async () => {
    const t = convexTest(schema, modules);
    await expect(
      record(t, acct(), { domain: { name: "bitchan", version: "1", chainId: 31337 } }),
    ).rejects.toThrow();
  });

  it("REJECTS a signature bound to a DIFFERENT contract", async () => {
    const t = convexTest(schema, modules);
    await expect(
      record(t, acct(), {
        domain: { name: "bitchan", version: "1", chainId: 31337, verifyingContract: "0x" + "22".repeat(20) },
      }),
    ).rejects.toThrow();
  });

  it("ACCEPTS a signature bound to the correct verifyingContract", async () => {
    const t = convexTest(schema, modules);
    await record(t, acct(), { domain: goodDomain });
    expect(await t.query(api.galleries.get, { hash: await manifestHash(IMAGES) })).toEqual({
      images: IMAGES,
    });
  });
});

describe("EIP-712 deadline (replay bound) — finding #5b", () => {
  it("REJECTS an expired signature", async () => {
    const t = convexTest(schema, modules);
    await expect(
      record(t, acct(), { domain: goodDomain, deadline: Math.floor(Date.now() / 1000) - 10 }),
    ).rejects.toThrow();
  });

  it("ACCEPTS a signature whose deadline is in the future", async () => {
    const t = convexTest(schema, modules);
    await record(t, acct(), { domain: goodDomain, deadline: FUTURE() });
    expect(await t.query(api.galleries.get, { hash: await manifestHash(IMAGES) })).toEqual({
      images: IMAGES,
    });
  });
});
