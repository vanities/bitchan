import { useQuery } from "@tanstack/react-query";
import { hexToBytes } from "viem";

const MEDIA_URL = (
  import.meta.env.VITE_MEDIA_URL ??
  import.meta.env.VITE_ENGAGEMENT_URL ??
  "http://localhost:42070"
).replace(/\/$/, "");

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The on-chain bytes32 `mediaHash` is the 32-byte content id; the URL uses its base64url form. */
export function idFromHash(hash: `0x${string}`): string {
  return bytesToB64url(hexToBytes(hash));
}

export function hasMedia(hash: string | undefined | null): boolean {
  return !!hash && !/^0x0+$/.test(hash);
}

export function mediaUrl(id: string): string {
  return `${MEDIA_URL}/media/${id}`;
}

export type UploadResult = { id: string; hash: `0x${string}`; mime: string; size: number };

/** Upload a file's raw bytes; returns the Arweave-style id + the 0x-hex hash for on-chain. */
export async function uploadMedia(file: File): Promise<UploadResult> {
  const res = await fetch(`${MEDIA_URL}/upload`, {
    method: "POST",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`upload failed (HTTP ${res.status})`);
  return (await res.json()) as UploadResult;
}

export type MediaInfo = { mime: string; size: number };

export function useMediaInfo(id: string | null) {
  return useQuery({
    queryKey: ["media-info", id],
    queryFn: async (): Promise<MediaInfo> => {
      const res = await fetch(`${MEDIA_URL}/media/${id}/info`);
      if (!res.ok) throw new Error(`media info HTTP ${res.status}`);
      return (await res.json()) as MediaInfo;
    },
    enabled: !!id,
    staleTime: Infinity, // content-addressed: a given id is immutable
  });
}
