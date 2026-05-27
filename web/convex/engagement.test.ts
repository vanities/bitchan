/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("engagement.engagement (bounded batch — read-DoS)", () => {
  it("REJECTS an oversized postIds batch (the attacker-controlled N×scan lever)", async () => {
    const t = convexTest(schema, modules);
    const tooMany = Array.from({ length: 101 }, (_, i) => String(i));
    await expect(t.query(api.engagement.engagement, { postIds: tooMany })).rejects.toThrow();
  });

  it("serves a normal-sized batch", async () => {
    const t = convexTest(schema, modules);
    const res = await t.query(api.engagement.engagement, { postIds: ["1", "2"] });
    expect(res).toEqual([
      { postId: "1", likes: 0, reposts: 0, likedByViewer: false, repostedByViewer: false },
      { postId: "2", likes: 0, reposts: 0, likedByViewer: false, repostedByViewer: false },
    ]);
  });
});
