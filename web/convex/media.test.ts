/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { api } from "./_generated/api";
import schema from "./schema";

const VERIFYING_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
process.env.BITCHAN_ADDRESS = VERIFYING_CONTRACT;

const modules = import.meta.glob("./**/*.ts");

const domain = {
  name: "bitchan",
  version: "1",
  chainId: 31337,
  verifyingContract: VERIFYING_CONTRACT,
} as const;
const UPLOAD_TYPES = {
  Upload: [
    { name: "hash", type: "string" },
    { name: "size", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;
const future = () => Math.floor(Date.now() / 1000) + 600;

// The NSFW screen calls the OpenAI moderation API over fetch. Stub it so tests are
// hermetic; and pin OPENAI_API_KEY present so screening takes the (stubbed) fetch
// path deterministically regardless of the ambient env (CI may not set it).
let savedKey: string | undefined;
beforeEach(() => {
  savedKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.ALLOW_UNSCREENED_UPLOADS;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ results: [{ categories: {} }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
});
afterEach(() => {
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = savedKey;
  delete process.env.ALLOW_UNSCREENED_UPLOADS;
  vi.unstubAllGlobals();
});

function newAccount() {
  return privateKeyToAccount(generatePrivateKey());
}

async function sha256Hex(bytes: ArrayBuffer): Promise<`0x${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

function pngBytes(): ArrayBuffer {
  const u8 = new Uint8Array(64);
  u8.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  u8.set([Math.floor(Math.random() * 255)], 32);
  return u8.buffer;
}
function svgBytes(): ArrayBuffer {
  return new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`)
    .buffer;
}

async function sign(account: ReturnType<typeof newAccount>, hash: string, size: number, deadline: number) {
  return account.signTypedData({
    domain,
    types: UPLOAD_TYPES,
    primaryType: "Upload",
    message: { hash, size: BigInt(size), deadline: BigInt(deadline) },
  });
}

describe("mediaActions.upload (authenticated + content-typed)", () => {
  it("REJECTS an unsigned upload — the original vuln let anyone store blobs anonymously", async () => {
    const t = convexTest(schema, modules);
    const bytes = pngBytes();
    await expect(
      t.action(api.mediaActions.upload, {
        bytes,
        address: newAccount().address,
        signature: "0xdeadbeef",
        deadline: future().toString(),
      }),
    ).rejects.toThrow();
    const hash = await sha256Hex(bytes);
    expect(await t.query(api.media.info, { hash })).toBeNull();
  });

  it("REJECTS a signature from a different key than the claimed address", async () => {
    const t = convexTest(schema, modules);
    const bytes = pngBytes();
    const hash = await sha256Hex(bytes);
    const deadline = future();
    const signature = await sign(newAccount(), hash, bytes.byteLength, deadline); // wrong signer
    await expect(
      t.action(api.mediaActions.upload, {
        bytes,
        address: newAccount().address,
        signature,
        deadline: deadline.toString(),
      }),
    ).rejects.toThrow();
  });

  it("REJECTS a signature bound to different content (no reusing a sig for other bytes)", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const bytesA = pngBytes();
    const deadline = future();
    const sigForA = await sign(author, await sha256Hex(bytesA), bytesA.byteLength, deadline);
    const bytesB = pngBytes(); // different content → different server-computed hash
    await expect(
      t.action(api.mediaActions.upload, {
        bytes: bytesB,
        address: author.address,
        signature: sigForA,
        deadline: deadline.toString(),
      }),
    ).rejects.toThrow();
  });

  it("REJECTS an expired signature (replay bound — finding #5b)", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const bytes = pngBytes();
    const hash = await sha256Hex(bytes);
    const past = Math.floor(Date.now() / 1000) - 10;
    const signature = await sign(author, hash, bytes.byteLength, past);
    await expect(
      t.action(api.mediaActions.upload, {
        bytes,
        address: author.address,
        signature,
        deadline: past.toString(),
      }),
    ).rejects.toThrow();
  });

  it("REJECTS an SVG even with a valid signature (content-type #3, end to end)", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const bytes = svgBytes();
    const deadline = future();
    const signature = await sign(author, await sha256Hex(bytes), bytes.byteLength, deadline);
    await expect(
      t.action(api.mediaActions.upload, {
        bytes,
        address: author.address,
        signature,
        deadline: deadline.toString(),
      }),
    ).rejects.toThrow();
  });

  it("ACCEPTS a valid signed PNG, stores it with the SNIFFED mime, and info() returns it", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const bytes = pngBytes();
    const hash = await sha256Hex(bytes);
    const deadline = future();
    const signature = await sign(author, hash, bytes.byteLength, deadline);
    const res = await t.action(api.mediaActions.upload, {
      bytes,
      address: author.address,
      signature,
      deadline: deadline.toString(),
    });
    expect(res.hash).toBe(hash);
    expect(res.mime).toBe("image/png");
    expect(await t.query(api.media.info, { hash })).toEqual({ mime: "image/png", size: bytes.byteLength });
  });

  it("ACCEPTS a session-delegated signed upload (the gasless path)", async () => {
    const t = convexTest(schema, modules);
    const author = newAccount();
    const delegate = newAccount();
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const delegationSig = await author.signTypedData({
      domain,
      types: {
        Delegation: [
          { name: "delegate", type: "address" },
          { name: "expiry", type: "uint256" },
        ],
      },
      primaryType: "Delegation",
      message: { delegate: delegate.address, expiry: BigInt(expiry) },
    });
    const bytes = pngBytes();
    const hash = await sha256Hex(bytes);
    const deadline = future();
    const signature = await sign(delegate, hash, bytes.byteLength, deadline);
    const res = await t.action(api.mediaActions.upload, {
      bytes,
      address: author.address,
      signature,
      deadline: deadline.toString(),
      delegate: delegate.address,
      expiry: expiry.toString(),
      delegationSig,
    });
    expect(res.hash).toBe(hash);
  });
});

describe("mediaActions.upload — moderation fail-closed", () => {
  it("REJECTS an upload when OPENAI_API_KEY is unset (no silent unscreened pass)", async () => {
    delete process.env.OPENAI_API_KEY;
    const t = convexTest(schema, modules);
    const author = newAccount();
    const bytes = pngBytes();
    const hash = await sha256Hex(bytes);
    const deadline = future();
    const signature = await sign(author, hash, bytes.byteLength, deadline);
    await expect(
      t.action(api.mediaActions.upload, {
        bytes,
        address: author.address,
        signature,
        deadline: deadline.toString(),
      }),
    ).rejects.toThrow();
  });

  it("ALLOWS an upload only when unscreened uploads are explicitly opted in (local dev)", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.ALLOW_UNSCREENED_UPLOADS = "true";
    const t = convexTest(schema, modules);
    const author = newAccount();
    const bytes = pngBytes();
    const hash = await sha256Hex(bytes);
    const deadline = future();
    const signature = await sign(author, hash, bytes.byteLength, deadline);
    const res = await t.action(api.mediaActions.upload, {
      bytes,
      address: author.address,
      signature,
      deadline: deadline.toString(),
    });
    expect(res.hash).toBe(hash);
  });
});
