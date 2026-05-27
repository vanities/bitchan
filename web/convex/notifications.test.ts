/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("notifications.feed", () => {
  it("returns an empty feed for a viewer with no activity (bounded query path)", async () => {
    const t = convexTest(schema, modules);
    const res = await t.query(api.notifications.feed, {
      viewer: "0x000000000000000000000000000000000000dEaD",
    });
    expect(res).toEqual([]);
  });
});
