import { useQuery } from "convex/react";
import { privateKeyToAccount } from "viem/accounts";
import { api } from "../../convex/_generated/api";
import { convex } from "./convex";
import { getSession } from "./session";
import { signingDomain, signatureDeadline } from "./contract";

// Media is stored in Convex (deletable + screened on upload) and served by the
// Convex HTTP action at /media/<hash>. The hash IS the on-chain bytes32 mediaHash
// (sha256 of the content), so the URL is content-addressed. See ARCHITECTURE.md §5.
const SITE_URL = (import.meta.env.VITE_CONVEX_SITE_URL ?? "").replace(/\/$/, "");

// Must match mediaActions.upload's domain/types.
const uploadDomain = signingDomain;
const UPLOAD_TYPES = {
  Upload: [
    { name: "hash", type: "string" },
    { name: "size", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

async function sha256Hex(bytes: ArrayBuffer): Promise<`0x${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

type Signer = Parameters<typeof getSession>[1];

export function hasMedia(hash: string | undefined | null): boolean {
  return !!hash && !/^0x0+$/.test(hash);
}

/** Stable URL for a media item, keyed by its on-chain hash. */
export function mediaUrl(hash: string): string {
  return `${SITE_URL}/media/${hash}`;
}

export type UploadResult = { hash: `0x${string}`; mime: string; size: number };

/**
 * Upload a file: authenticated (signed with the user's session key), screened
 * (NSFW) + stored server-side. Returns the sha256 hash (= the on-chain mediaHash)
 * to put in the post tx. Throws if the signature is rejected, or the file is
 * rejected by the moderation check, too large, or not an allowed image type.
 */
export async function uploadMedia(
  file: File,
  auth: { address: `0x${string}`; signTypedDataAsync: Signer },
): Promise<UploadResult> {
  const bytes = await file.arrayBuffer();
  const hash = await sha256Hex(bytes);
  const deadline = BigInt(signatureDeadline());
  const session = await getSession(auth.address, auth.signTypedDataAsync);
  const delegate = privateKeyToAccount(session.privateKey);
  const signature = await delegate.signTypedData({
    domain: uploadDomain,
    types: UPLOAD_TYPES,
    primaryType: "Upload",
    message: { hash, size: BigInt(bytes.byteLength), deadline },
  });
  const r = await convex.action(api.mediaActions.upload, {
    bytes,
    address: auth.address,
    signature,
    deadline: deadline.toString(),
    delegate: session.delegate,
    expiry: session.expiry.toString(),
    delegationSig: session.delegationSig,
  });
  return { hash: r.hash as `0x${string}`, mime: r.mime, size: r.size };
}

export type MediaInfo = { mime: string; size: number };

/** mime + size for a stored item; `undefined` while loading, `null` if not found. */
export function useMediaInfo(hash: string | null) {
  return useQuery(api.media.info, hash && hasMedia(hash) ? { hash } : "skip");
}
