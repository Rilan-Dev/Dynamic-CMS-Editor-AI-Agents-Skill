import { describe, expect, it } from "vitest";
import type { JsonObject } from "./json";
import { normalizeCmsDocument, stableCmsId } from "./documentNormalization";

describe("normalizeCmsDocument", () => {
  it("adds deterministic IDs and visibility defaults to object arrays", () => {
    const input = {
      registrations: [
        { title: "VAT" },
        { id: "kept", title: "ISO", visible: false },
      ],
    } as JsonObject;

    const first = normalizeCmsDocument("certifications", input) as any;
    const second = normalizeCmsDocument("certifications", input) as any;

    expect(first.registrations[0].id).toBe(second.registrations[0].id);
    expect(first.registrations[0].visible).toBe(true);
    expect(first.registrations[1]).toMatchObject({ id: "kept", visible: false });
  });

  it("adds animation document defaults without replacing content", () => {
    const normalized = normalizeCmsDocument("home", {
      hero: { title: "Hello" },
    } as JsonObject) as any;

    expect(normalized.hero.title).toBe("Hello");
    expect(normalized.animations).toEqual({
      page: { mode: "inherit" },
      sections: {},
      components: {},
    });
  });

  it("adds shared animation defaults to the site document", () => {
    const normalized = normalizeCmsDocument("site", {
      navbar: { links: [] },
    } as JsonObject) as any;

    expect(normalized.animations.global).toMatchObject({
      mode: "override",
      preset: "none",
    });
    expect(normalized.animations.defaultsByType).toBeTruthy();
    expect(normalized.animations.pageTransition.enabled).toBe(false);
  });

  it("migrates footer social records and the service-reference column", () => {
    const normalized = normalizeCmsDocument("site", {
      footer: {
        columns: [
          {
            heading: "Our Services",
            type: "links",
            links: [{ label: "Building Contracting" }],
          },
        ],
        socialLinks: [
          {
            label: "Facebook",
            icon: "Facebook",
            href: "https://facebook.com/smts",
            visible: true,
          },
          {
            id: "bad",
            platform: "myspace",
            href: "https://example.com",
            enabled: true,
          },
        ],
      },
    } as JsonObject) as any;

    expect(normalized.footer.columns[0].type).toBe("serviceReferences");
    expect(normalized.footer.socialLinks[0]).toMatchObject({
      id: "facebook",
      platform: "facebook",
      enabled: true,
    });
    expect(normalized.footer.socialLinks[1]).toMatchObject({
      id: "bad",
      platform: "myspace",
      enabled: true,
    });
  });
});

describe("stableCmsId", () => {
  it("returns a CSS and JSON safe deterministic identifier", () => {
    const first = stableCmsId("site", ["navbar", "links"], { name: "Home" }, 0);
    const second = stableCmsId("site", ["navbar", "links"], { name: "Home" }, 0);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-z0-9-]+$/);
  });
});
