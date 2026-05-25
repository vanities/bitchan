import { useQuery } from "@tanstack/react-query";
import { gql, TIMELINE_QUERY, type TimelineData } from "./graphql";

export type Handles = Map<string, string | null>;

/** Shared timeline query — react-query dedupes by key, so every view reads one fetch. */
export function useTimeline() {
  const q = useQuery({
    queryKey: ["timeline"],
    queryFn: () => gql<TimelineData>(TIMELINE_QUERY),
    refetchInterval: 5000,
  });

  const handles: Handles = new Map();
  for (const a of q.data?.accounts.items ?? []) handles.set(a.address.toLowerCase(), a.handle);

  return {
    posts: q.data?.posts.items ?? [],
    handles,
    isLoading: q.isLoading,
    error: q.error,
  };
}
