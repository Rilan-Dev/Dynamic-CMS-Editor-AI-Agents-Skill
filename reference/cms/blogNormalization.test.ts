import { describe, expect, it } from "vitest";
import { normalizeCmsDocument } from "./documentNormalization";
import type { JsonObject } from "./json";

describe("blog post normalization", () => {
  const normalize = (document: JsonObject) =>
    normalizeCmsDocument("blog-smart-farming", document);

  it("derives the slug from the document name", () => {
    expect(normalize({ title: "Smart Farming" }).slug).toBe("smart-farming");
  });

  it("keeps an editor-supplied slug", () => {
    expect(normalize({ title: "T", slug: "custom" }).slug).toBe("custom");
  });

  it("defaults an unset status to draft", () => {
    expect(normalize({ title: "T" }).status).toBe("draft");
    expect(normalize({ title: "T", status: "published" }).status).toBe("published");
  });

  it("dates an undated post today", () => {
    expect(String(normalize({ title: "T" }).publishedAt)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("computes reading minutes from the body when absent", () => {
    const body = [{ type: "paragraph", text: "word ".repeat(400) }];
    expect(normalize({ title: "T", body }).readingMinutes).toBe(2);
  });

  it("leaves a stored reading time alone", () => {
    expect(normalize({ title: "T", readingMinutes: 9 }).readingMinutes).toBe(9);
  });

  it("gives every block a stable id", () => {
    const result = normalize({
      title: "T",
      body: [
        { type: "heading", text: "One" },
        { type: "paragraph", text: "Two" },
      ],
    });
    const body = result.body as JsonObject[];
    expect(typeof body[0].id).toBe("string");
    expect(body[0].id).not.toBe("");
    expect(body[0].id).not.toBe(body[1].id);
  });

  it("is idempotent", () => {
    const once = normalize({ title: "T", body: [{ type: "paragraph", text: "x" }] });
    expect(normalize(once)).toEqual(once);
  });
});

describe("blog index normalization", () => {
  it("gives categories stable ids and a roster array", () => {
    const result = normalizeCmsDocument("blogs", {
      categories: [{ slug: "safety", label: "Safety" }],
    });
    const categories = result.categories as JsonObject[];
    expect(typeof categories[0].id).toBe("string");
    expect(result.posts).toEqual([]);
  });

  it("keeps an existing roster", () => {
    const result = normalizeCmsDocument("blogs", {
      posts: [{ id: "p1", slug: "smart-farming" }],
    });
    expect((result.posts as JsonObject[])[0].slug).toBe("smart-farming");
  });
});

describe("blog navigation link", () => {
  it("adds a Blog link to an existing published navbar", () => {
    const result = normalizeCmsDocument("site", {
      navbar: { links: [{ name: "Home", href: "/" }] },
    });
    const links = (result.navbar as JsonObject).links as JsonObject[];
    expect(links.some((link) => link.href === "/blogs")).toBe(true);
  });

  it("does not add a second one", () => {
    const once = normalizeCmsDocument("site", {
      navbar: { links: [{ name: "Blog", href: "/blogs" }] },
    });
    const links = (once.navbar as JsonObject).links as JsonObject[];
    expect(links.filter((link) => link.href === "/blogs")).toHaveLength(1);
  });
});

describe("blog navigation icon", () => {
  it("uses an icon the project actually ships", async () => {
    const { ALL_ICONS } = await import("./icons");
    const result = normalizeCmsDocument("site", { navbar: { links: [] } });
    const links = (result.navbar as JsonObject).links as JsonObject[];
    const blog = links.find((link) => link.href === "/blogs");
    // An unknown name silently falls back to a chevron in the navbar.
    expect(Object.keys(ALL_ICONS)).toContain(String(blog?.icon));
  });
});
