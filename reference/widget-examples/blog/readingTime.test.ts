import { describe, expect, it } from "vitest";
import { readingMinutes } from "./readingTime";

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");

describe("readingMinutes", () => {
  it("counts words across paragraph, heading and list blocks", () => {
    expect(
      readingMinutes([
        { type: "heading", text: words(20) },
        { type: "paragraph", text: words(200) },
        { type: "bulletList", items: [words(30), words(30)] },
      ]),
    ).toBe(2);
  });

  it("never reports less than one minute", () => {
    expect(readingMinutes([{ type: "paragraph", text: "short" }])).toBe(1);
    expect(readingMinutes([])).toBe(1);
  });

  it("ignores blocks without readable text", () => {
    expect(
      readingMinutes([
        { type: "image", src: "/a.jpg", alt: "a", caption: "" },
        { type: "paragraph", text: words(400) },
      ]),
    ).toBe(2);
  });

  it("survives malformed input", () => {
    expect(readingMinutes(null)).toBe(1);
    expect(readingMinutes([{ type: "paragraph" }, "nope"] as never)).toBe(1);
  });
});
