import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { convex } from "./convex";

// Multi-image posts: store the ordered image hashes under a manifest hash
// (sha256 of the list) and use that as the post's on-chain mediaHash. PostCard
// looks the hash up; a hit renders a gallery, a miss is a single media item.
async function sha256Hex(text: string): Promise<`0x${string}`> {
  // Copy into a plain ArrayBuffer so the type is unambiguous for crypto.subtle.
  const encoded = new TextEncoder().encode(text);
  const buf = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buf).set(encoded);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

/** Record a gallery and return its manifest hash (the on-chain mediaHash to post). */
export async function recordGallery(images: `0x${string}`[]): Promise<`0x${string}`> {
  const hash = await sha256Hex(JSON.stringify(images));
  await convex.mutation(api.galleries.record, { hash, images });
  return hash;
}

/** Image hashes for a gallery mediaHash; `undefined` while loading, `null` if not a gallery. */
export function useGallery(hash: string | null) {
  const res = useQuery(api.galleries.get, hash && /^0x[0-9a-f]{64}$/i.test(hash) ? { hash } : "skip");
  return res === undefined ? undefined : (res?.images ?? null);
}
