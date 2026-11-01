import { describe, expect, it } from "vitest";
import type { JsonObject } from "@/components/cms/json";
import { buildBlogIndex, buildPost, postHref } from "./blogModel";

const postDocument: JsonObject = {
  title: "The Future of Smart Farming",
  excerpt: "How AI and IoT change agriculture.",
  category: "smart-farming",
  image: "/images/blog/smart-farming.jpg",
  author: "SMTS Team",
  publishedAt: "2026-04-25",
  status: "published",
  body: [
    { id: "b1", type: "heading", text: "What is Smart Farming?" },
    { id: "b2", type: "paragraph", text: "Smart farming uses sensors." },
  ],
};

describe("buildPost", () => {
  const post = buildPost("blog-smart-farming", postDocument);

  it("derives the slug and href from the document name", () => {
    expect(post?.slug).toBe("smart-farming");
    expect(post?.href).toBe("/blogs/smart-farming");
  });

  it("carries the card fields", () => {
    expect(post?.title).toBe("The Future of Smart Farming");
    expect(post?.excerpt).toBe("How AI and IoT change agriculture.");
    expect(post?.category).toBe("smart-farming");
    expect(post?.author).toBe("SMTS Team");
    expect(post?.publishedAt).toBe("2026-04-25");
  });

  it("computes reading minutes when the document omits them", () => {
    expect(post?.readingMinutes).toBe(1);
  });

  it("prefers a stored reading time", () => {
    expect(
      buildPost("blog-x", { ...postDocument, readingMinutes: 7 })?.readingMinutes,
    ).toBe(7);
  });

  it("treats a missing status as a draft", () => {
    const { status, ...withoutStatus } = postDocument;
    expect(buildPost("blog-x", withoutStatus)?.status).toBe("draft");
  });

  it("keeps only recognised block types", () => {
    const built = buildPost("blog-x", {
      ...postDocument,
      body: [
        { id: "b1", type: "paragraph", text: "kept" },
        { id: "b2", type: "script", text: "dropped" },
      ],
    });
    expect(built?.body.map((block) => block.type)).toEqual(["paragraph"]);
  });

  it("returns null for a document that is not a post", () => {
    expect(buildPost("blogs", postDocument)).toBeNull();
  });
});

describe("buildBlogIndex", () => {
  const index = buildBlogIndex({
    hero: { title: "Agriculture Insights", subtitle: "Tomorrow's farming." },
    categories: [
      { id: "c1", slug: "smart-farming", label: "Smart Farming" },
      { id: "c2", slug: "plants", label: "Plants" },
    ],
    posts: [{ id: "p1", slug: "smart-farming" }],
    postsPerPage: 6,
  });

  it("exposes categories and the roster", () => {
    expect(index.categories.map((category) => category.slug)).toEqual([
      "smart-farming",
      "plants",
    ]);
    expect(index.roster).toEqual(["smart-farming"]);
  });

  it("falls back to six posts per page", () => {
    expect(buildBlogIndex({}).postsPerPage).toBe(6);
    expect(index.postsPerPage).toBe(6);
  });

  it("ignores malformed categories and roster entries", () => {
    const messy = buildBlogIndex({
      categories: [{ id: "c1" }, "nope", { id: "c2", slug: "ok", label: "Ok" }],
      posts: ["nope", { id: "p1", slug: "fine" }],
    });
    expect(messy.categories.map((category) => category.slug)).toEqual(["ok"]);
    expect(messy.roster).toEqual(["fine"]);
  });
});

describe("postHref", () => {
  it("builds the article URL", () => {
    expect(postHref("greenhouse-farming")).toBe("/blogs/greenhouse-farming");
  });
});

describe("buildBlogIndex hidden categories", () => {
  it("drops categories an editor has hidden", () => {
    const index = buildBlogIndex({
      categories: [
        { id: "a", slug: "projects", label: "Projects" },
        { id: "b", slug: "safety", label: "Safety", visible: false },
      ],
    });
    expect(index.categories.map((category) => category.slug)).toEqual(["projects"]);
  });
});
