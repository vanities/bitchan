import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { verifyActor } from "./lib/eip712";
import { sniffImageMime } from "./lib/imageType";

// EIP-712 payload the uploader signs. Binds the upload to (content hash, size) so a
// signature can't be reused for different bytes. Must match web/src/lib/media.ts.
const UPLOAD_TYPES = {
  Upload: [
    { name: "hash", type: "string" },
    { name: "size", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

// Media upload, screened. A normal Convex action (no "use node" — we only use
// Web APIs: crypto.subtle, fetch, Blob). Flow: sha256 → NSFW check → store →
// record. The sha256 IS the on-chain bytes32 mediaHash, so the chain commits to
// the content. Media lives in Convex (deletable) not Arweave, so illegal content
// can be taken down — see [[bitchan-convex-backend]].

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — keeps us under Convex's arg limit
const REJECT_CATEGORIES = ["sexual", "sexual/minors"] as const;

// Per-address upload budget (anti storage/moderation-cost abuse). Generous for
// legit posting (galleries are ≤4 images), tight enough to bound a spammer.
const UPLOAD_MAX_PER_WINDOW = 40;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

/// Returns null if allowed, or a reason string if the image should be rejected.
/// Fails CLOSED: if a key is configured but the check errors, we reject.
async function screenImage(dataUrl: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // Fail closed: without a moderation key we can't screen, so refuse — unless a
    // deploy explicitly opts out for local dev. Production must set OPENAI_API_KEY.
    if (process.env.ALLOW_UNSCREENED_UPLOADS === "true") {
      console.warn(
        "[media] OPENAI_API_KEY unset + ALLOW_UNSCREENED_UPLOADS=true — skipping NSFW check (dev only)",
      );
      return null;
    }
    console.error(
      "[media] OPENAI_API_KEY unset — refusing upload. Set the key, or ALLOW_UNSCREENED_UPLOADS=true for local dev.",
    );
    return "image moderation is unavailable — try again later";
  }
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: dataUrl } }],
      }),
    });
  } catch (e) {
    console.error("[media] moderation request threw — failing closed", e);
    return "moderation unavailable, try again";
  }
  if (!res.ok) {
    console.error(`[media] moderation HTTP ${res.status} — failing closed`);
    return "moderation unavailable, try again";
  }
  const json = (await res.json()) as { results?: { categories?: Record<string, boolean> }[] };
  const categories = json.results?.[0]?.categories ?? {};
  const hit = REJECT_CATEGORIES.find((c) => categories[c]);
  if (hit) {
    console.warn(`[media] rejected by moderation: ${hit}`);
    return "this image was flagged as explicit and can't be posted";
  }
  return null;
}

// Upload an image: authenticated (EIP-712 signature from the uploader, direct or
// session-delegated), content-typed by sniffing the real bytes, NSFW-screened, then
// stored. Closes review findings #2 (was unauthenticated → anyone could fill storage
// / burn the moderation budget) and #3 (caller-claimed MIME could smuggle an SVG).
export const upload = action({
  args: {
    bytes: v.bytes(),
    address: v.string(),
    signature: v.string(),
    deadline: v.string(),
    delegate: v.optional(v.string()),
    expiry: v.optional(v.string()),
    delegationSig: v.optional(v.string()),
  },
  returns: v.object({ hash: v.string(), mime: v.string(), size: v.number() }),
  handler: async (ctx, a): Promise<{ hash: string; mime: string; size: number }> => {
    const bytes = a.bytes;
    const size = bytes.byteLength;
    if (size === 0) throw new Error("empty file");
    if (size > MAX_BYTES) throw new Error(`file too large (max ${MAX_BYTES / 1024 / 1024} MB)`);

    // Never trust the caller's claimed type — sniff the real bytes. SVG/HTML/text
    // (script-carrying) and any non-allowlisted format are refused here.
    const mime = sniffImageMime(bytes);
    if (!mime) throw new Error("unsupported or unsafe file — only PNG, JPEG, GIF, WebP images are allowed");

    const hash = "0x" + (await sha256Hex(bytes));

    // The signature must come from the uploader (or their session delegate) and be
    // bound to THIS content (hash) — verified before any storage / moderation spend.
    const signer = await verifyActor({
      label: "upload",
      address: a.address,
      types: UPLOAD_TYPES,
      primaryType: "Upload",
      message: { hash, size: BigInt(size), deadline: BigInt(a.deadline) },
      signature: a.signature,
      deadline: a.deadline,
      delegation: { delegate: a.delegate, expiry: a.expiry, delegationSig: a.delegationSig },
    });
    if (!signer) throw new Error("invalid signature");

    // Same content already stored? Return it — no re-screen, no duplicate blob.
    const existing = await ctx.runQuery(internal.media.byHash, { hash });
    if (existing) return { hash, mime: existing.mime, size };

    // Only NEW content reaches here (re-uploads are deduped above, free). Charge it
    // against the uploader's rate-limit budget before any storage / moderation spend.
    await ctx.runMutation(internal.rateLimit.consume, {
      key: `upload:${signer}`,
      max: UPLOAD_MAX_PER_WINDOW,
      windowMs: UPLOAD_WINDOW_MS,
    });

    const reason = await screenImage(`data:${mime};base64,${toBase64(bytes)}`);
    if (reason) throw new Error(reason);

    const storageId = await ctx.storage.store(new Blob([bytes], { type: mime }));
    await ctx.runMutation(internal.media.record, { hash, storageId, mime, size });
    console.log(`[media] stored ${hash} (${mime}, ${size}b) by ${signer}`);
    return { hash, mime, size };
  },
});
