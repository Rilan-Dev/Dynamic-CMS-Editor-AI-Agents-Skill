import { describe, expect, it } from "vitest";
import {
  BLOG_SLUG_PATTERN,
  blogDocumentName,
  blogSlug,
  blogSlugFromDocument,
  isBlogDocument,
} from "./blogSlug";

describe("blogSlug", () => {
  it("lowercases and hyphenates a title", () => {
    expect(blogSlug("The Future of Smart Farming with AI")).toBe(
      "the-future-of-smart-farming-with-ai",
    );
  });

  it("strips punctuation and collapses separators", () => {
    expect(blogSlug("  Greenhouse Farming: A Sustainable Future!! ")).toBe(
      "greenhouse-farming-a-sustainable-future",
    );
  });

  it("caps length without leaving a trailing hyphen", () => {
    const slug = blogSlug("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(64);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back to 'post' when nothing survives", () => {
    expect(blogSlug("!!!")).toBe("post");
    expect(blogSlug("")).toBe("post");
  });

  it("always matches the slug pattern", () => {
    expect(BLOG_SLUG_PATTERN.test(blogSlug("IoT Sensors for Crops"))).toBe(true);
  });
});

describe("document naming", () => {
  it("maps a slug to its document name and back", () => {
    expect(blogDocumentName("smart-farming")).toBe("blog-smart-farming");
    expect(blogSlugFromDocument("blog-smart-farming")).toBe("smart-farming");
  });

  it("recognises blog documents only", () => {
    expect(isBlogDocument("blog-smart-farming")).toBe(true);
    expect(isBlogDocument("blogs")).toBe(false);
    expect(isBlogDocument("services")).toBe(false);
  });

  it("returns null for a document that is not a post", () => {
    expect(blogSlugFromDocument("blogs")).toBeNull();
    expect(blogSlugFromDocument("blog-")).toBeNull();
  });
});
