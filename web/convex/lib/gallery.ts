// Canonical manifest hash for a multi-image gallery: "0x" + sha256(JSON.stringify(images)).
// This MUST stay byte-for-byte identical to the client (web/src/lib/gallery.ts) and
// to the on-chain mediaHash the post commits to. The server recomputes it to reject
// any `galleries.record` whose claimed hash doesn't match its images.
export async function manifestHash(images: string[]): Promise<`0x${string}`> {
  const encoded = new TextEncoder().encode(JSON.stringify(images));
  // Copy into a plain ArrayBuffer so the type is unambiguous for crypto.subtle.
  const bytes = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(bytes).set(encoded);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}
