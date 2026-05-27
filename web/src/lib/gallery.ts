import { useQuery } from "convex/react";
import { privateKeyToAccount } from "viem/accounts";
import { api } from "../../convex/_generated/api";
import { convex } from "./convex";
import { getSession } from "./session";
import { signingDomain, signatureDeadline } from "./contract";

// Multi-image posts: store the ordered image hashes under a manifest hash
// (sha256 of the list) and use that as the post's on-chain mediaHash. PostCard
// looks the hash up; a hit renders a gallery, a miss is a single media item.

// Must match galleryActions.record's domain/types (and convex/lib/gallery.ts hash).
const galleryDomain = signingDomain;
const GALLERY_TYPES = {
  Gallery: [
    { name: "hash", type: "string" },
    { name: "images", type: "string[]" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/** "0x" + sha256(JSON.stringify(images)) — identical to convex/lib/gallery.ts. */
async function manifestHash(images: `0x${string}`[]): Promise<`0x${string}`> {
  const encoded = new TextEncoder().encode(JSON.stringify(images));
  const buf = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buf).set(encoded);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

type Signer = Parameters<typeof getSession>[1];

/**
 * Record a gallery and return its manifest hash (the on-chain mediaHash to post).
 * Authenticated: signs the manifest with the user's session key (one wallet popup
 * the first time, silent after) so the backend can prove the author recorded it.
 */
export async function recordGallery(
  images: `0x${string}`[],
  auth: { address: `0x${string}`; signTypedDataAsync: Signer },
): Promise<`0x${string}`> {
  const hash = await manifestHash(images);
  const deadline = BigInt(signatureDeadline());
  const session = await getSession(auth.address, auth.signTypedDataAsync);
  const delegate = privateKeyToAccount(session.privateKey);
  const signature = await delegate.signTypedData({
    domain: galleryDomain,
    types: GALLERY_TYPES,
    primaryType: "Gallery",
    message: { hash, images, deadline },
  });
  await convex.action(api.galleryActions.record, {
    hash,
    images,
    address: auth.address,
    signature,
    deadline: deadline.toString(),
    delegate: session.delegate,
    expiry: session.expiry.toString(),
    delegationSig: session.delegationSig,
  });
  return hash;
}

/** Image hashes for a gallery mediaHash; `undefined` while loading, `null` if not a gallery. */
export function useGallery(hash: string | null) {
  const res = useQuery(api.galleries.get, hash && /^0x[0-9a-f]{64}$/i.test(hash) ? { hash } : "skip");
  return res === undefined ? undefined : (res?.images ?? null);
}
