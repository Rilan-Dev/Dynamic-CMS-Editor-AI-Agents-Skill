import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/cms/ReadOnlyIcon.tsx", "utf8");

describe("ReadOnlyIcon", () => {
  it("renders both uploaded image icons and registered Lucide icons", () => {
    expect(source).toContain("resolveIconValue");
    expect(source).toContain("ALL_ICONS");
    expect(source).toContain('resolved.kind === "image"');
  });

  it("never opens the editable icon picker", () => {
    expect(source).not.toContain("EIcon");
    expect(source).not.toContain("IconSelector");
  });
});
