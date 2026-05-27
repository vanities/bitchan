import { describe, expect, it } from "vitest";
import { sniffImageMime, SERVABLE_IMAGE_MIMES } from "./imageType";

// Build an ArrayBuffer from a byte list, padded so length checks pass.
function buf(prefix: number[], len = 32): ArrayBuffer {
  const u8 = new Uint8Array(len);
  u8.set(prefix);
  return u8.buffer;
}

// "RIFF" + 4 size bytes + "WEBP".
function webp(): ArrayBuffer {
  const u8 = new Uint8Array(32);
  u8.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  u8.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  return u8.buffer;
}

describe("sniffImageMime", () => {
  it("detects PNG by magic bytes", () => {
    expect(sniffImageMime(buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
  });

  it("detects JPEG by magic bytes", () => {
    expect(sniffImageMime(buf([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("detects GIF87a and GIF89a", () => {
    expect(sniffImageMime(buf([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]))).toBe("image/gif");
    expect(sniffImageMime(buf([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
  });

  it("detects WebP", () => {
    expect(sniffImageMime(webp())).toBe("image/webp");
  });

  // THE XSS VULN (#3): an SVG is text/markup that can carry <script>. The old
  // code accepted anything whose *claimed* mime started with "image/", so
  // "image/svg+xml" sailed through and got served inline. Real bytes must be sniffed.
  it("rejects SVG (script-carrying markup) regardless of any claimed mime", () => {
    const svg = new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
    );
    expect(sniffImageMime(svg.buffer)).toBeNull();
  });

  it("rejects HTML", () => {
    const html = new TextEncoder().encode(`<!doctype html><script>alert(1)</script>`);
    expect(sniffImageMime(html.buffer)).toBeNull();
  });

  it("rejects empty / too-short input", () => {
    expect(sniffImageMime(new ArrayBuffer(0))).toBeNull();
    expect(sniffImageMime(new Uint8Array([0x89, 0x50]).buffer)).toBeNull();
  });

  it("only ever returns a mime from the servable allowlist", () => {
    const png = sniffImageMime(buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png).not.toBeNull();
    expect(SERVABLE_IMAGE_MIMES.has(png!)).toBe(true);
    expect(SERVABLE_IMAGE_MIMES.has("image/svg+xml")).toBe(false);
  });
});
