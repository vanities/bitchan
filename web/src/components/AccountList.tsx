import type { Handles, Avatars } from "../lib/useTimeline";
import { hasMedia, mediaUrl } from "../lib/media";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Reusable dialog listing accounts (handle + address, avatar if known), each a
// link to the profile. Used for liked-by / reposted-by lists.
export function AccountList({
  title,
  addresses,
  handles,
  avatars,
  onOpenProfile,
  onClose,
}: {
  title: string;
  addresses?: string[];
  handles: Handles;
  avatars?: Avatars;
  onOpenProfile?: (a: `0x${string}`) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-line bg-ink p-0">
        <DialogTitle className="border-b border-line px-4 py-3 text-sm font-bold text-bone">
          {title}
        </DialogTitle>
        <ul className="max-h-[60vh] overflow-y-auto">
          {addresses === undefined && (
            <li className="px-4 py-6 text-center text-sm text-bone-dim">loading…</li>
          )}
          {addresses && addresses.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-bone-dim">Nobody yet.</li>
          )}
          {(addresses ?? []).map((a) => {
            const av = avatars?.get(a.toLowerCase());
            return (
              <li key={a}>
                <button
                  onClick={() => onOpenProfile?.(a as `0x${string}`)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-ink-soft"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-seal text-xs font-bold text-white">
                    {av && hasMedia(av) ? (
                      <img src={mediaUrl(av)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (handles.get(a.toLowerCase()) ?? "a")[0]!.toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-bone">
                      {handles.get(a.toLowerCase()) ?? "anon"}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-bone-dim">
                      {a.slice(0, 10)}…{a.slice(-6)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
