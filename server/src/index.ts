import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Database } from "bun:sqlite";
import { getAddress, verifyTypedData, type Hex } from "viem";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";

// bitchan off-chain services:
//  1. Gasless engagement — likes/reposts/follows as EIP-712 signed messages (no gas).
//  2. Media — content-addressed multimedia (images/video). Bytes in, 32-byte content
//     hash out; that hash is what a post stores on-chain (`mediaHash`). This mirrors
//     Arweave's content-addressed model; in production swap this endpoint for
//     Irys/Arweave (or arlocal to test) — the contract and frontend are unchanged.

const PORT = Number(process.env.PORT ?? 42070);
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);
const DB_PATH = process.env.DB_PATH ?? "engagement.sqlite";
const MEDIA_DIR = process.env.MEDIA_DIR ?? "media";
const MAX_BYTES = Number(process.env.MAX_MEDIA_BYTES ?? 25 * 1024 * 1024); // 25 MB

mkdirSync(MEDIA_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.run(`
  CREATE TABLE IF NOT EXISTS reactions (
    signer     TEXT    NOT NULL,
    kind       TEXT    NOT NULL,
    target     TEXT    NOT NULL,
    active     INTEGER NOT NULL,
    nonce      TEXT    NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (signer, kind, target)
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS media (
    id      TEXT    PRIMARY KEY,  -- base64url(sha256(bytes)) — the Arweave-style id
    mime    TEXT    NOT NULL,
    size    INTEGER NOT NULL,
    created INTEGER NOT NULL
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
const insertMedia = db.prepare(`
  INSERT INTO media (id, mime, size, created) VALUES ($id, $mime, $size, $created)
  ON CONFLICT(id) DO NOTHING
`);
const getMedia = db.prepare("SELECT mime, size FROM media WHERE id = $id");

const app = new Hono();
app.use("*", logger()); // request log: method, path, status, timing
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
  } catch (e) {
    console.error("[react] verify threw", e);
    valid = false;
  }
  if (!valid) {
    console.warn(`[react] rejected bad signature: ${kind} ${target} by ${address}`);
    return c.json({ error: "invalid signature" }, 401);
  }

  const signer = getAddress(address);
  upsert.run({
    $signer: signer,
    $kind: kind,
    $target: String(target),
    $active: active ? 1 : 0,
    $nonce: String(nonce),
    $updated_at: Date.now(),
  });
  console.log(`[react] ${active ? "+" : "-"}${kind} ${target} by ${signer}`);
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

// --- Media (content-addressed; swap for Arweave/Irys in prod) ---

// Upload: raw bytes in the body, the file's mime in Content-Type.
// Returns the Arweave-style id (base64url) + the 0x-hex hash that goes on-chain.
app.post("/upload", async (c) => {
  const mime = c.req.header("content-type") || "application/octet-stream";
  const buf = new Uint8Array(await c.req.arrayBuffer());
  if (buf.length === 0) return c.json({ error: "empty body" }, 400);
  if (buf.length > MAX_BYTES) {
    console.warn(`[media] rejected oversize upload: ${buf.length} bytes (max ${MAX_BYTES})`);
    return c.json({ error: "too large", max: MAX_BYTES }, 413);
  }

  const hash = createHash("sha256").update(buf).digest(); // 32-byte Buffer
  const id = hash.toString("base64url");
  const hashHex = `0x${hash.toString("hex")}`;
  const path = `${MEDIA_DIR}/${id}`;
  if (!existsSync(path)) await Bun.write(path, buf);
  insertMedia.run({ $id: id, $mime: mime, $size: buf.length, $created: Date.now() });

  console.log(`[media] upload id=${id.slice(0, 12)}… mime=${mime} size=${buf.length}`);
  return c.json({ id, hash: hashHex, mime, size: buf.length });
});

app.get("/media/:id/info", (c) => {
  const row = getMedia.get({ $id: c.req.param("id") }) as { mime: string; size: number } | undefined;
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ mime: row.mime, size: row.size });
});

app.get("/media/:id", (c) => {
  const id = c.req.param("id");
  const row = getMedia.get({ $id: id }) as { mime: string } | undefined;
  const path = `${MEDIA_DIR}/${id}`;
  if (!row || !existsSync(path)) return c.json({ error: "not found" }, 404);
  return new Response(Bun.file(path), {
    headers: { "content-type": row.mime, "cache-control": "public, max-age=31536000, immutable" },
  });
});

console.log(`bitchan server on :${PORT} (chainId ${CHAIN_ID}, db ${DB_PATH}, media ${MEDIA_DIR}/)`);

export default { port: PORT, fetch: app.fetch };
