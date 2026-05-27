// Dynamic 1200x630 link-preview image, rendered by @vercel/og (Satori) on the edge.
// /api/og?text=... — referenced from the og:image tags injected by og-page.js.
// Satori constraints: inline styles only, flexbox only, any element with >1 child
// must set display:flex.
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export default function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("text") ?? "an on-chain republic").trim() || "an on-chain republic";
  const text = raw.length > 150 ? `${raw.slice(0, 150)}…` : raw;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0a0e17",
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          height: 10,
          width: "100%",
          borderRadius: 6,
          background: "linear-gradient(90deg,#e5384e,#3d7bff,#e5384e)",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 44, fontSize: 44, fontWeight: 800 }}>
        <span style={{ color: "#f5f7fa" }}>bitchan</span>
        <span style={{ color: "#e5384e" }}>.</span>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          overflow: "hidden",
          fontSize: 58,
          fontWeight: 700,
          lineHeight: 1.25,
          color: "#f5f7fa",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 24,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "#8b95a9",
        }}
      >
        an on-chain republic
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
