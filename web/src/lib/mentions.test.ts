import { describe, it, expect } from "vitest";
import { mentionTokens, MENTION_SPLIT_RE } from "./mentions";

describe("mentionTokens", () => {
  it("extracts handles after @", () => {
    expect(mentionTokens("gm @alice and @bob_1, welcome")).toEqual(["alice", "bob_1"]);
  });

  it("returns nothing for text without mentions", () => {
    expect(mentionTokens("just a normal post")).toEqual([]);
  });

  it("does not treat an @ inside a word as a mention (e.g. emails)", () => {
    expect(mentionTokens("reach me at a@b.com")).toEqual([]);
  });

  it("matches a mention at the start of the text", () => {
    expect(mentionTokens("@satoshi was here")).toEqual(["satoshi"]);
  });
});

describe("MENTION_SPLIT_RE", () => {
  it("splits text into segments and mention tokens", () => {
    expect("hi @alice!".split(MENTION_SPLIT_RE)).toEqual(["hi ", "@alice", "!"]);
  });
});
