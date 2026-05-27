import { describe, it, expect } from "vitest";
import { parseEmbed, firstEmbed } from "./embeds";

describe("parseEmbed", () => {
  it("parses youtube watch URLs", () => {
    expect(parseEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("parses youtu.be short URLs (ignoring tracking params)", () => {
    expect(parseEmbed("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toEqual({
      kind: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("parses youtube shorts and embed paths", () => {
    expect(parseEmbed("https://youtube.com/shorts/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      id: "dQw4w9WgXcQ",
    });
    expect(parseEmbed("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("parses vimeo URLs", () => {
    expect(parseEmbed("https://vimeo.com/123456789")).toEqual({ kind: "vimeo", id: "123456789" });
  });

  it("returns null for non-video and malformed URLs", () => {
    expect(parseEmbed("https://example.com/watch?v=nope")).toBeNull();
    expect(parseEmbed("not a url")).toBeNull();
    expect(parseEmbed("https://youtube.com/watch?v=short")).toBeNull();
  });
});

describe("firstEmbed", () => {
  it("finds the first embeddable link in text", () => {
    expect(firstEmbed("gm! watch https://youtu.be/dQw4w9WgXcQ now")).toEqual({
      kind: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("strips trailing punctuation before parsing", () => {
    expect(firstEmbed("(see https://vimeo.com/123456789).")).toEqual({ kind: "vimeo", id: "123456789" });
  });

  it("returns null when no embeddable link is present", () => {
    expect(firstEmbed("just text and https://example.com")).toBeNull();
  });
});
