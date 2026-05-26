import { ConvexReactClient } from "convex/react";

// The single Convex client: backs the <ConvexProvider> for reactive useQuery,
// and is used imperatively (convex.action) by submitReaction outside React.
const url = import.meta.env.VITE_CONVEX_URL;
if (!url) {
  console.error("VITE_CONVEX_URL is not set — the timeline/engagement backend will not load.");
}

export const convex = new ConvexReactClient(url ?? "");
