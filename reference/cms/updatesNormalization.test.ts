import { describe, expect, it } from "vitest";
import { normalizeCmsDocument } from "./documentNormalization";
import type { JsonObject } from "./json";

describe("updates index normalization", () => {
  const normalize = (document: JsonObject) => normalizeCmsDocument("updates", document);

  it("seeds a missing status to draft", () => {
    const result = normalize({
      types: [],
      entries: [{ headline: "Site visit" }],
    });
    expect((result.entries as JsonObject[])[0].status).toBe("draft");
  });

  it("keeps a published status", () => {
    const result = normalize({
      types: [],
      entries: [{ headline: "Site visit", status: "published" }],
    });
    expect((result.entries as JsonObject[])[0].status).toBe("published");
  });

  it("defaults pinned to false", () => {
    const result = normalize({ types: [], entries: [{ headline: "Site visit" }] });
    expect((result.entries as JsonObject[])[0].pinned).toBe(false);
  });

  it("keeps pinned true when set", () => {
    const result = normalize({
      types: [],
      entries: [{ headline: "Site visit", pinned: true }],
    });
    expect((result.entries as JsonObject[])[0].pinned).toBe(true);
  });

  it("keeps a valid postedAt", () => {
    const result = normalize({
      types: [],
      entries: [{ headline: "Site visit", postedAt: "2026-04-01T10:00:00.000Z" }],
    });
    expect((result.entries as JsonObject[])[0].postedAt).toBe(
      "2026-04-01T10:00:00.000Z",
    );
  });

  it("stamps an invalid or missing postedAt with the current time", () => {
    const result = normalize({
      types: [],
      entries: [
        { headline: "Site visit", postedAt: "not-a-date" },
        { headline: "No date at all" },
      ],
    });
    const entries = result.entries as JsonObject[];
    expect(String(entries[0].postedAt)).not.toBe("not-a-date");
    expect(Number.isNaN(Date.parse(String(entries[0].postedAt)))).toBe(false);
    expect(Number.isNaN(Date.parse(String(entries[1].postedAt)))).toBe(false);
  });

  it("gives entries and types stable ids", () => {
    const result = normalize({
      types: [{ slug: "milestone", label: "Milestone" }],
      entries: [{ headline: "Site visit" }],
    });
    expect(typeof (result.types as JsonObject[])[0].id).toBe("string");
    expect(typeof (result.entries as JsonObject[])[0].id).toBe("string");
  });

  it("is idempotent", () => {
    const once = normalize({
      types: [{ slug: "milestone", label: "Milestone" }],
      entries: [{ headline: "Site visit" }],
    });
    expect(normalize(once)).toEqual(once);
  });
});

describe("updates navigation link", () => {
  it("adds an Updates link after Blog in the navbar", () => {
    const result = normalizeCmsDocument("site", {
      navbar: { links: [{ name: "Home", href: "/" }] },
    });
    const links = (result.navbar as JsonObject).links as JsonObject[];
    const blogIndex = links.findIndex((link) => link.href === "/blogs");
    const updatesIndex = links.findIndex((link) => link.href === "/updates");
    expect(updatesIndex).toBeGreaterThan(-1);
    expect(updatesIndex).toBe(blogIndex + 1);
  });

  it("does not add a second one", () => {
    const once = normalizeCmsDocument("site", {
      navbar: {
        links: [
          { name: "Blog", href: "/blogs" },
          { name: "Updates", href: "/updates" },
        ],
      },
    });
    const links = (once.navbar as JsonObject).links as JsonObject[];
    expect(links.filter((link) => link.href === "/updates")).toHaveLength(1);
  });

  it("adds an Updates link to the footer quick links", () => {
    const result = normalizeCmsDocument("site", {
      navbar: { links: [] },
      footer: {
        columns: [{ heading: "Quick Links", type: "links", links: [] }],
      },
    });
    const footer = result.footer as JsonObject;
    const quickLinks = (footer.columns as JsonObject[])[0].links as JsonObject[];
    expect(quickLinks.some((link) => link.href === "/updates")).toBe(true);
  });

  it("uses an icon the project actually ships", async () => {
    const { ALL_ICONS } = await import("./icons");
    const result = normalizeCmsDocument("site", { navbar: { links: [] } });
    const links = (result.navbar as JsonObject).links as JsonObject[];
    const updates = links.find((link) => link.href === "/updates");
    expect(Object.keys(ALL_ICONS)).toContain(String(updates?.icon));
  });
});
