/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { api } from "./_generated/api";
import schema from "./schema";
import { manifestHash } from "./lib/gallery";

// The backend binds the signing domain to BITCHAN_ADDRESS; match it here.
const VERIFYING_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
process.env.BITCHAN_ADDRESS = VERIFYING_CONTRACT;

const modules = import.meta.glob("./**/*.ts");

// Must match galleryActions.record's domain/types exactly.
const domain = {
  name: "bitchan",
  version: "1",
  chainId: 31337,
  verifyingContract: VERIFYING_CONTRACT,
} as const;
const GALLERY_TYPES = {
  Gallery: [
    { name: "hash", type: "string" },
    { name: "images", type: "string[]" },
    { name: "deadline", type: "uint256" },
  ],
} as const;
const DELEGATION_TYPES = {
  Delegation: [
    { name: "delegate", type: "address" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

const IMAGES = [
  "0x1111111111111111111111111111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222222222222222222222222222",
];
const future = () => Math.floor(Date.now() / 1000) + 600;

function newAccount() {
  return privateKeyToAccount(generatePrivateKey());
}

describe("galleries.record (authenticated)", () => {
  it("REJECTS an unsigned/forged record — the original vuln let anyone write any gallery", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const hash = await manifestHash(IMAGES);
    await expect(
      t.action(api.galleryActions.record, {
        hash,
        images: IMAGES,
        address: author.address,
        signature: "0xdeadbeef", // not a real signature
        deadline: future().toString(),
      }),
    ).rejects.toThrow();
    expect(await t.query(api.galleries.get, { hash })).toBeNull();
  });

  it("REJECTS a record where the signature is from a different key than the claimed address", async () => {
    const t = convexTest(schema, modules);
    const claimed = newAccount();
    const actualSigner = newAccount();
    const hash = await manifestHash(IMAGES);
    const deadline = future();
    const signature = await actualSigner.signTypedData({
      domain,
      types: GALLERY_TYPES,
      primaryType: "Gallery",
      message: { hash, images: IMAGES, deadline: BigInt(deadline) },
    });
    await expect(
      t.action(api.galleryActions.record, {
        hash,
        images: IMAGES,
        address: claimed.address,
        signature,
        deadline: deadline.toString(),
      }),
    ).rejects.toThrow();
  });

  it("REJECTS a hash that doesn't match the images (manifest integrity)", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const wrongHash = "0x" + "ab".repeat(32);
    const deadline = future();
    const signature = await author.signTypedData({
      domain,
      types: GALLERY_TYPES,
      primaryType: "Gallery",
      message: { hash: wrongHash, images: IMAGES, deadline: BigInt(deadline) },
    });
    await expect(
      t.action(api.galleryActions.record, {
        hash: wrongHash,
        images: IMAGES,
        address: author.address,
        signature,
        deadline: deadline.toString(),
      }),
    ).rejects.toThrow();
  });

  it("RECORDS a gallery signed directly by the author, and get() returns it", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const hash = await manifestHash(IMAGES);
    const deadline = future();
    const signature = await author.signTypedData({
      domain,
      types: GALLERY_TYPES,
      primaryType: "Gallery",
      message: { hash, images: IMAGES, deadline: BigInt(deadline) },
    });
    await t.action(api.galleryActions.record, {
      hash,
      images: IMAGES,
      address: author.address,
      signature,
      deadline: deadline.toString(),
    });
    expect(await t.query(api.galleries.get, { hash })).toEqual({ images: IMAGES });
  });

  it("RECORDS via a session-delegated signature (the gasless path)", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const delegate = newAccount();
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const delegationSig = await author.signTypedData({
      domain,
      types: DELEGATION_TYPES,
      primaryType: "Delegation",
      message: { delegate: delegate.address, expiry: BigInt(expiry) },
    });
    const hash = await manifestHash(IMAGES);
    const deadline = future();
    const signature = await delegate.signTypedData({
      domain,
      types: GALLERY_TYPES,
      primaryType: "Gallery",
      message: { hash, images: IMAGES, deadline: BigInt(deadline) },
    });
    await t.action(api.galleryActions.record, {
      hash,
      images: IMAGES,
      address: author.address,
      signature,
      deadline: deadline.toString(),
      delegate: delegate.address,
      expiry: expiry.toString(),
      delegationSig,
    });
    expect(await t.query(api.galleries.get, { hash })).toEqual({ images: IMAGES });
  });
});
