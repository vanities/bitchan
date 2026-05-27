/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("rateLimit.consume (fixed window)", () => {
  it("allows up to `max` calls then rejects within the window", async () => {
    const t = convexTest(schema, modules);
    const args = { key: "upload:0xabc", max: 3, windowMs: 60_000 };
    await t.mutation(internal.rateLimit.consume, args);
    await t.mutation(internal.rateLimit.consume, args);
    await t.mutation(internal.rateLimit.consume, args);
    await expect(t.mutation(internal.rateLimit.consume, args)).rejects.toThrow();
  });

  it("tracks limits independently per key", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.rateLimit.consume, { key: "upload:0xA", max: 1, windowMs: 60_000 });
    await t.mutation(internal.rateLimit.consume, { key: "upload:0xB", max: 1, windowMs: 60_000 });
    await expect(
      t.mutation(internal.rateLimit.consume, { key: "upload:0xA", max: 1, windowMs: 60_000 }),
    ).rejects.toThrow();
  });

  it("resets after the window lapses", async () => {
    const t = convexTest(schema, modules);
    const key = "upload:0xC";
    await t.mutation(internal.rateLimit.consume, { key, max: 1, windowMs: 1 });
    await new Promise((r) => setTimeout(r, 5)); // let the 1ms window pass
    await t.mutation(internal.rateLimit.consume, { key, max: 1, windowMs: 1 }); // fresh window → ok
  });
});
