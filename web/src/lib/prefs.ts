import { useSyncExternalStore } from "react";

// Viewer-local preferences kept in localStorage (no wallet, no server): the
// permissionless moderation floor. `blocked`/`muted` hold lowercased addresses,
// `bookmarks` holds post ids. Reactive via useSyncExternalStore so every card
// updates the moment you toggle, and changes sync across tabs.
const KEYS = {
  blocked: "bitchan.blocked",
  muted: "bitchan.muted",
  bookmarks: "bitchan.bookmarks",
} as const;
export type PrefKind = keyof typeof KEYS;

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

function read(kind: PrefKind): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS[kind]) || "[]");
  } catch {
    return [];
  }
}

export function togglePref(kind: PrefKind, value: string) {
  const v = value.toLowerCase();
  const cur = read(kind);
  const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
  localStorage.setItem(KEYS[kind], JSON.stringify(next));
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // cross-tab updates
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePref(kind: PrefKind): { list: string[]; has: (value: string) => boolean } {
  // Snapshot is the raw JSON string (stable identity when unchanged).
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(KEYS[kind]) || "[]",
    () => "[]",
  );
  const list = JSON.parse(raw) as string[];
  return { list, has: (value: string) => list.includes(value.toLowerCase()) };
}
