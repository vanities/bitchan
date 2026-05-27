import { describe, it, expect } from "vitest";
import { tokenize } from "./links";

describe("tokenize", () => {
  it("returns a single text token for plain text", () => {
    expect(tokenize("just a normal post")).toEqual([{ type: "text", value: "just a normal post" }]);
  });

  it("splits out @mentions (without the leading @)", () => {
    expect(tokenize("gm @alice")).toEqual([
      { type: "text", value: "gm " },
      { type: "mention", handle: "alice" },
    ]);
  });

  it("does not treat an @ inside a word (email) as a mention", () => {
    expect(tokenize("mail a@b.com")).toEqual([{ type: "text", value: "mail a@b.com" }]);
  });

  it("extracts a URL", () => {
    expect(tokenize("see https://x.com/a")).toEqual([
      { type: "text", value: "see " },
      { type: "url", href: "https://x.com/a" },
    ]);
  });

  it("strips trailing sentence punctuation off a URL", () => {
    expect(tokenize("watch https://youtu.be/abc.")).toEqual([
      { type: "text", value: "watch " },
      { type: "url", href: "https://youtu.be/abc" },
      { type: "text", value: "." },
    ]);
  });

  it("handles a mention and a URL together", () => {
    expect(tokenize("@bob check https://b.io done")).toEqual([
      { type: "mention", handle: "bob" },
      { type: "text", value: " check " },
      { type: "url", href: "https://b.io" },
      { type: "text", value: " done" },
    ]);
  });
});
