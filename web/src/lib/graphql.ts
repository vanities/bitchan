const endpoint = import.meta.env.VITE_PONDER_URL ?? "http://localhost:42069/graphql";

export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data as T;
}

export type TimelinePost = {
  id: string;
  author: `0x${string}`;
  text: string;
  mediaHash: `0x${string}`;
  parentId: string;
  quotedId: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  hidden: boolean;
  createdAt: string;
};

export type AccountRow = { address: `0x${string}`; handle: string | null };

export type TimelineData = {
  posts: { items: TimelinePost[] };
  accounts: { items: AccountRow[] };
};

export const TIMELINE_QUERY = `
  query Timeline {
    posts(orderBy: "createdAt", orderDirection: "desc", where: { hidden: false }, limit: 100) {
      items {
        id
        author
        text
        mediaHash
        parentId
        quotedId
        likeCount
        replyCount
        repostCount
        hidden
        createdAt
      }
    }
    accounts(limit: 200) {
      items {
        address
        handle
      }
    }
  }
`;

export type StatsData = {
  posts: { totalCount: number };
  accounts: { totalCount: number };
};

export const STATS_QUERY = `
  query Stats {
    posts(limit: 1) {
      totalCount
    }
    accounts(limit: 1) {
      totalCount
    }
  }
`;
