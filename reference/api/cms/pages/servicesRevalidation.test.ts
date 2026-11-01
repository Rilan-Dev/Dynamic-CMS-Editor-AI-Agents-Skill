import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("lib/server/cmsRevalidation.ts", "utf8");

describe("publishing the services document", () => {
  it("revalidates the page's own route", () => {
    expect(route).toContain(
      'revalidatePath(slug === "home" ? "/" : `/${slug}`)',
    );
  });

  it("revalidates both detail route trees", () => {
    expect(route).toContain('revalidatePath("/services/[slug]", "page")');
    expect(route).toContain(
      'revalidatePath("/services/[slug]/[child]", "page")',
    );
  });
});

describe("publishing blog documents", () => {
  it("refreshes the listing and the article routes", () => {
    // A post document is named blog-<slug>, which is not a route: the old
    // branch called revalidatePath("/blog-<slug>") and never refreshed the
    // static listing, so a published article stayed invisible.
    expect(route).toContain('slug === "blogs" || isBlogDocument(slug)');
    expect(route).toContain('revalidatePath("/blogs")');
    expect(route).toContain('revalidatePath("/blogs/[slug]", "page")');
  });

  it("never revalidates the document name as if it were a path", () => {
    expect(route).not.toMatch(/revalidatePath\(`\/\$\{slug\}`\)[\s\S]{0,40}blog/);
  });
});

describe("publishing the updates document", () => {
  it("revalidates the updates route and the root layout", () => {
    // The navbar preview reads the updates document on every page, so
    // publishing it must refresh the whole layout, not just /updates.
    expect(route).toContain('slug === "updates"');
    const updatesBranch = route.slice(route.indexOf('slug === "updates"'));
    expect(updatesBranch).toContain('revalidatePath("/updates")');
    expect(updatesBranch).toContain('revalidatePath("/", "layout")');
  });
});
