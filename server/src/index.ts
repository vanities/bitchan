import { Hono } from "hono";
import { cors } from "hono/cors";
import { Database } from "bun:sqlite";
import { getAddress, verifyTypedData, type Hex } from "viem";

// Gasless engagement service.
// Likes / reposts / follows are NOT on-chain transactions — the user signs an
// EIP-712 message (free, no gas), we verify the signature recovers to the
// claimed signer, and store the toggle. Posts/replies stay on-chain; this is
// only the cheap, high-frequency engagement layer.

const PORT = Number(process.env.PORT ?? 42070);
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);
const DB_PATH = process.env.DB_PATH ?? "engagement.sqlite";

const db = new Database(DB_PATH);
db.run(`
  CREATE TABLE IF NOT EXISTS reactions (
    signer     TEXT    NOT NULL,
    kind       TEXT    NOT NULL,   -- 'like' | 'repost' | 'follow'
    target     TEXT    NOT NULL,   -- postId (like/repost) or address (follow)
    active     INTEGER NOT NULL,   -- 1 = on, 0 = toggled off
    nonce      TEXT    NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (signer, kind, target)
  )
`);

// Must match the frontend exactly.
const domain = { name: "bitchan", version: "1", chainId: CHAIN_ID } as const;
const types = {
  Reaction: [
    { name: "kind", type: "string" },
    { name: "target", type: "string" },
    { name: "active", type: "bool" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

const upsert = db.prepare(`
  INSERT INTO reactions (signer, kind, target, active, nonce, updated_at)
  VALUES ($signer, $kind, $target, $active, $nonce, $updated_at)
  ON CONFLICT(signer, kind, target)
  DO UPDATE SET active = $active, nonce = $nonce, updated_at = $updated_at
`);
const countActive = db.prepare(
  "SELECT COUNT(*) AS n FROM reactions WHERE kind = $kind AND target = $target AND active = 1",
);
const viewerActive = db.prepare(
  "SELECT 1 FROM reactions WHERE signer = $signer AND kind = $kind AND target = $target AND active = 1",
);
const followingBySigner = db.prepare(
  "SELECT target FROM reactions WHERE signer = $signer AND kind = 'follow' AND active = 1",
);

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, chainId: CHAIN_ID }));

app.post("/react", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }

  const { address, kind, target, active, nonce, signature } = body as {
    address?: string;
    kind?: string;
    target?: string;
    active?: boolean;
    nonce?: string;
    signature?: string;
  };

  if (!address || !kind || target == null || nonce == null || !signature) {
    return c.json({ error: "missing fields" }, 400);
  }
  if (!["like", "repost", "follow"].includes(kind)) {
    return c.json({ error: "bad kind" }, 400);
  }

  const message = { kind, target: String(target), active: !!active, nonce: BigInt(nonce) };

  let valid = false;
  try {
    valid = await verifyTypedData({
      address: address as Hex,
      domain,
      types,
      primaryType: "Reaction",
      message,
      signature: signature as Hex,
    });
  } catch {
    valid = false;
  }
  if (!valid) return c.json({ error: "invalid signature" }, 401);

  const signer = getAddress(address);
  upsert.run({
    $signer: signer,
    $kind: kind,
    $target: String(target),
    $active: active ? 1 : 0,
    $nonce: String(nonce),
    $updated_at: Date.now(),
  });

  return c.json({ ok: true, signer, kind, target: String(target), active: !!active });
});

app.get("/engagement", (c) => {
  const viewerRaw = c.req.query("viewer");
  let viewer = "";
  try {
    if (viewerRaw) viewer = getAddress(viewerRaw);
  } catch {
    viewer = "";
  }
  const ids = (c.req.query("postIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const out: Record<string, { likes: number; reposts: number; likedByViewer: boolean; repostedByViewer: boolean }> = {};
  for (const id of ids) {
    const likes = (countActive.get({ $kind: "like", $target: id }) as { n: number }).n;
    const reposts = (countActive.get({ $kind: "repost", $target: id }) as { n: number }).n;
    const likedByViewer = viewer
      ? !!viewerActive.get({ $signer: viewer, $kind: "like", $target: id })
      : false;
    const repostedByViewer = viewer
      ? !!viewerActive.get({ $signer: viewer, $kind: "repost", $target: id })
      : false;
    out[id] = { likes, reposts, likedByViewer, repostedByViewer };
  }
  return c.json(out);
});

// Addresses that `account` currently follows — powers the follow button + Following feed.
app.get("/following", (c) => {
  const acct = c.req.query("account");
  let signer = "";
  try {
    if (acct) signer = getAddress(acct);
  } catch {
    signer = "";
  }
  if (!signer) return c.json({ following: [] });
  const rows = followingBySigner.all({ $signer: signer }) as { target: string }[];
  return c.json({ following: rows.map((r) => r.target) });
});

console.log(`bitchan engagement server on :${PORT} (chainId ${CHAIN_ID}, db ${DB_PATH})`);

export default { port: PORT, fetch: app.fetch };
