import { describe, expect, it } from "vitest";
import type { JsonObject } from "@/components/cms/json";
import { BLOCK_TYPES } from "@/components/blog/blogModel";
import { CONTENT_REGISTRY } from "@/content/registry";
import { defaultBlogIndex, defaultBlogPost } from "./blogDefaults";

describe("defaultBlogIndex", () => {
  const index = defaultBlogIndex();

  it("ships hero copy, a search placeholder and a sidebar call to action", () => {
    expect((index.hero as JsonObject).title).toBeTruthy();
    expect((index.search as JsonObject).placeholder).toBeTruthy();
    expect((index.cta as JsonObject).buttonHref).toBe("/contact");
  });

  it("ships categories with slugs and labels", () => {
    const categories = index.categories as JsonObject[];
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      expect(typeof category.slug).toBe("string");
      expect(typeof category.label).toBe("string");
    }
  });

  it("starts with an empty roster and a page size", () => {
    expect(index.posts).toEqual([]);
    expect(index.postsPerPage).toBe(6);
  });
});

describe("defaultBlogPost", () => {
  const post = defaultBlogPost({
    title: "Smart Irrigation",
    slug: "smart-irrigation",
    category: "maintenance",
  });

  it("uses the seed for identity and stays unpublished", () => {
    expect(post.title).toBe("Smart Irrigation");
    expect(post.slug).toBe("smart-irrigation");
    expect(post.category).toBe("maintenance");
    expect(post.status).toBe("draft");
  });

  it("dates the post today in ISO form", () => {
    expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("seeds a body of recognised block types", () => {
    const body = post.body as JsonObject[];
    expect(body.length).toBeGreaterThan(2);
    for (const block of body) {
      expect(BLOCK_TYPES).toContain(block.type);
    }
  });

  it("returns a fresh object each call", () => {
    const other = defaultBlogPost({ title: "B", slug: "b", category: "" });
    expect(other.body).not.toBe(post.body);
  });
});

describe("blogs registry document", () => {
  it("is registered so /blogs renders before anything is published", () => {
    expect(CONTENT_REGISTRY.blogs).toBeTruthy();
    expect((CONTENT_REGISTRY.blogs as JsonObject).categories).toBeTruthy();
  });
});
