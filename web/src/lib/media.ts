import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { convex } from "./convex";

// Media is stored in Convex (deletable + screened on upload) and served by the
// Convex HTTP action at /media/<hash>. The hash IS the on-chain bytes32 mediaHash
// (sha256 of the content), so the URL is content-addressed. See ARCHITECTURE.md §5.
const SITE_URL = (import.meta.env.VITE_CONVEX_SITE_URL ?? "").replace(/\/$/, "");

export function hasMedia(hash: string | undefined | null): boolean {
  return !!hash && !/^0x0+$/.test(hash);
}

/** Stable URL for a media item, keyed by its on-chain hash. */
export function mediaUrl(hash: string): string {
  return `${SITE_URL}/media/${hash}`;
}

export type UploadResult = { hash: `0x${string}`; mime: string; size: number };

/**
 * Upload a file: screened (NSFW) + stored server-side. Returns the sha256 hash
 * (= the on-chain mediaHash) to put in the post tx. Throws if the file is
 * rejected by the moderation check or is too large / unsupported.
 */
export async function uploadMedia(file: File): Promise<UploadResult> {
  const bytes = await file.arrayBuffer();
  const r = await convex.action(api.mediaActions.upload, {
    bytes,
    mime: file.type || "application/octet-stream",
  });
  return { hash: r.hash as `0x${string}`, mime: r.mime, size: r.size };
}

export type MediaInfo = { mime: string; size: number };

/** mime + size for a stored item; `undefined` while loading, `null` if not found. */
export function useMediaInfo(hash: string | null) {
  return useQuery(api.media.info, hash && hasMedia(hash) ? { hash } : "skip");
}
