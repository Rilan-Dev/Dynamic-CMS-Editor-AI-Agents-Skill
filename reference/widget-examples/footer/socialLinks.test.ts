import { describe, expect, it } from "vitest";
import {
  SOCIAL_PLATFORMS,
  availableSocialPlatforms,
  migrateSocialLinks,
  normalizeSocialLinks,
  validateSocialHref,
} from "./socialLinks";

describe("footer social model", () => {
  it("contains exactly the approved platforms", () => {
    expect(SOCIAL_PLATFORMS).toEqual([
      "facebook",
      "instagram",
      "linkedin",
      "x",
      "youtube",
      "tiktok",
      "whatsapp",
      "website",
    ]);
  });

  it("migrates legacy rows and preserves structured invalid rows for repair", () => {
    expect(
      migrateSocialLinks([
        {
          label: "LinkedIn",
          icon: "Linkedin",
          href: "https://linkedin.com/company/smts",
          visible: true,
        },
        {
          id: "bad",
          platform: "myspace",
          href: "https://example.com",
          enabled: true,
        },
        {
          id: "instagram-a",
          platform: "instagram",
          href: "https://instagram.com/a",
          enabled: true,
        },
        {
          id: "instagram-b",
          platform: "instagram",
          href: "https://instagram.com/b",
          enabled: true,
        },
      ]),
    ).toEqual([
      {
        id: "linkedin",
        platform: "linkedin",
        href: "https://linkedin.com/company/smts",
        enabled: true,
      },
      {
        id: "bad",
        platform: "myspace",
        href: "https://example.com",
        enabled: true,
      },
      {
        id: "instagram-a",
        platform: "instagram",
        href: "https://instagram.com/a",
        enabled: true,
      },
      {
        id: "instagram-b",
        platform: "instagram",
        href: "https://instagram.com/b",
        enabled: true,
      },
    ]);
  });

  it("normalizes public output to the first supported platform occurrence", () => {
    expect(
      normalizeSocialLinks([
        { id: "bad", platform: "myspace", href: "https://example.com", enabled: true },
        { id: "ig-a", platform: "instagram", href: "https://instagram.com/a", enabled: true },
        { id: "ig-b", platform: "instagram", href: "https://instagram.com/b", enabled: true },
      ]),
    ).toEqual([
      { id: "ig-a", platform: "instagram", href: "https://instagram.com/a", enabled: true },
    ]);
  });

  it("returns only unused supported platforms", () => {
    const available = availableSocialPlatforms([
      { id: "facebook", platform: "facebook", href: "https://facebook.com/smts", enabled: true },
      { id: "bad", platform: "myspace", href: "https://example.com", enabled: true },
    ]);
    expect(available).not.toContain("facebook");
    expect(available).toContain("youtube");
  });

  it.each([
    ["website", "/contact", true],
    ["website", "#footer", true],
    ["website", "https://smtscontracting.com", true],
    ["instagram", "https://instagram.com/smts", true],
    ["instagram", "/instagram", false],
    ["website", "//evil.example", false],
    ["website", "javascript:alert(1)", false],
    ["facebook", "", false],
  ] as const)("validates %s link %s", (platform, href, valid) => {
    expect(validateSocialHref(platform, href).valid).toBe(valid);
  });
});
