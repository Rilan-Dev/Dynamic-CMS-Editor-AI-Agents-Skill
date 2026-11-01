import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "components/footer/SocialPlatformIcon.tsx",
  "utf8",
);

describe("SocialPlatformIcon", () => {
  it("contains all eight local SVG glyphs", () => {
    for (const platform of [
      "facebook",
      "instagram",
      "linkedin",
      "x",
      "youtube",
      "tiktok",
      "whatsapp",
      "website",
    ]) {
      expect(source).toContain(`${platform}:`);
    }
    expect(source).toContain("<svg");
    expect(source).toContain("currentColor");
  });

  it("cannot use the generic Settings fallback", () => {
    expect(source).not.toContain("EditableIcon");
    expect(source).not.toContain("ALL_ICONS");
    expect(source).not.toContain("Settings");
  });
});
