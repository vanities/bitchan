// Copies the repo's living docs (../docs/*.md) into web/public/docs so the in-app
// Charter page can fetch + render them. Runs before dev and build (see
// package.json), so the page always reflects the docs in the current deploy.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = join(here, "..", "..", "docs");
const outDir = join(here, "..", "public", "docs");

// On Vercel the build is scoped to web/, so ../docs isn't present — fall back to
// the committed copy in public/docs (refreshed here whenever ../docs exists).
if (!existsSync(docsDir)) {
  console.log("[sync-docs] ../docs not present (scoped build) — using committed public/docs");
  process.exit(0);
}

// Curated reading order + friendly labels; anything not listed is appended.
const ORDER = [
  "WHITEPAPER",
  "CONSTITUTION",
  "GOVERNANCE_MVP",
  "CONVENTION",
  "ARCHITECTURE",
  "CONTENTIONS",
  "DEPLOYMENTS",
];
const LABELS = {
  WHITEPAPER: "White Paper",
  CONSTITUTION: "Constitution",
  GOVERNANCE_MVP: "Governance — Build Plan",
  CONVENTION: "Ratifying Convention",
  ARCHITECTURE: "Architecture",
  CONTENTIONS: "Contentions (living log)",
  DEPLOYMENTS: "Deployments",
};

mkdirSync(outDir, { recursive: true });
const files = readdirSync(docsDir).filter((f) => f.endsWith(".md"));
const entries = files.map((file) => {
  const text = readFileSync(join(docsDir, file), "utf8");
  copyFileSync(join(docsDir, file), join(outDir, file));
  const slug = file.replace(/\.md$/, "");
  const heading = text.match(/^#\s+(.+)$/m);
  return { file, slug, title: LABELS[slug] ?? (heading ? heading[1].trim() : slug) };
});
entries.sort((a, b) => {
  const rank = (s) => (ORDER.indexOf(s) === -1 ? 99 : ORDER.indexOf(s));
  return rank(a.slug) - rank(b.slug);
});
writeFileSync(join(outDir, "index.json"), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`[sync-docs] copied ${entries.length} docs → public/docs`);
