// Content-type safety for uploaded media. The on-chain mediaHash is just sha256
// of arbitrary bytes, and the bytes are served back inline from our origin — so we
// must NEVER trust the caller's claimed MIME. An attacker who can get
// `image/svg+xml` (or any text/markup) stored + served inline gets stored XSS in
// the Convex origin. We sniff the real bytes by magic number and only allow a
// small allowlist of raster formats that cannot carry script.

export type ServableImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

// The only content types we will ever store or serve. Notably excludes
// image/svg+xml. Used by the upload action (what we store) and http.ts (what we serve).
export const SERVABLE_IMAGE_MIMES: ReadonlySet<string> = new Set<ServableImageMime>([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/**
 * Identify an image by its leading bytes, ignoring any caller-supplied MIME.
 * Returns the real MIME (always in {@link SERVABLE_IMAGE_MIMES}) or `null` if the
 * bytes are not one of the allowed raster formats (SVG, HTML, text, etc. → null).
 */
export function sniffImageMime(bytes: ArrayBuffer): ServableImageMime | null {
  const b = new Uint8Array(bytes);
  if (b.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";

  // GIF: "GIF87a" or "GIF89a"
  if (
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) &&
    b[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: "RIFF" <4 bytes size> "WEBP"
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
