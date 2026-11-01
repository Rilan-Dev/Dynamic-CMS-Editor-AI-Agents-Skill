import { describe, expect, it } from "vitest";
import type { BlogPost } from "./blogModel";
import {
  adjacentPosts,
  categoryCounts,
  filterPosts,
  relatedPosts,
  sortByNewest,
  visiblePosts,
} from "./blogFilters";

const post = (over: Partial<BlogPost>): BlogPost => ({
  slug: "s",
  href: "/blogs/s",
  title: "Title",
  excerpt: "Excerpt",
  category: "smart-farming",
  image: "",
  author: "SMTS",
  publishedAt: "2026-01-01",
  readingMinutes: 3,
  status: "published",
  body: [],
  seo: { title: "Title", description: "Excerpt" },
  ...over,
});

const posts = [
  post({ slug: "a", title: "Smart Irrigation Systems", publishedAt: "2026-04-10" }),
  post({ slug: "b", title: "Greenhouse Farming", category: "greenhouses", publishedAt: "2026-04-20" }),
  post({ slug: "c", title: "Vertical Green Walls", category: "plants", publishedAt: "2026-04-16" }),
  post({ slug: "d", title: "Unfinished", status: "draft", publishedAt: "2026-05-01" }),
];

describe("visiblePosts", () => {
  it("hides drafts from visitors", () => {
    expect(visiblePosts(posts, false).map((entry) => entry.slug)).toEqual(["a", "b", "c"]);
  });

  it("shows drafts while editing", () => {
    expect(visiblePosts(posts, true)).toHaveLength(4);
  });
});

describe("sortByNewest", () => {
  it("orders by publication date, newest first", () => {
    expect(sortByNewest(visiblePosts(posts, false)).map((entry) => entry.slug)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("does not mutate its input", () => {
    const input = visiblePosts(posts, false);
    sortByNewest(input);
    expect(input.map((entry) => entry.slug)).toEqual(["a", "b", "c"]);
  });
});

describe("filterPosts", () => {
  it("filters by category", () => {
    expect(
      filterPosts(posts, { category: "greenhouses", query: "" }).map((e) => e.slug),
    ).toEqual(["b"]);
  });

  it("searches title, excerpt and category, case-insensitively", () => {
    expect(filterPosts(posts, { category: "", query: "IRRIGATION" }).map((e) => e.slug)).toEqual(["a"]);
    expect(
      filterPosts([post({ slug: "x", excerpt: "About drip irrigation" })], {
        category: "",
        query: "drip",
      }),
    ).toHaveLength(1);
  });

  it("combines category and query", () => {
    expect(
      filterPosts(posts, { category: "plants", query: "vertical" }).map((e) => e.slug),
    ).toEqual(["c"]);
    expect(filterPosts(posts, { category: "plants", query: "irrigation" })).toEqual([]);
  });

  it("returns everything when both filters are empty", () => {
    expect(filterPosts(posts, { category: "", query: "  " })).toHaveLength(4);
  });
});

describe("categoryCounts", () => {
  it("counts posts per category, including empty ones", () => {
    expect(
      categoryCounts(visiblePosts(posts, false), [
        { id: "1", slug: "smart-farming", label: "Smart Farming" },
        { id: "2", slug: "maintenance", label: "Maintenance" },
      ]),
    ).toEqual([
      { id: "1", slug: "smart-farming", label: "Smart Farming", count: 1 },
      { id: "2", slug: "maintenance", label: "Maintenance", count: 0 },
    ]);
  });
});

describe("relatedPosts", () => {
  const current = post({ slug: "a", category: "smart-farming" });
  const pool = [
    current,
    post({ slug: "same-1", category: "smart-farming", publishedAt: "2026-03-01" }),
    post({ slug: "same-2", category: "smart-farming", publishedAt: "2026-03-05" }),
    post({ slug: "other", category: "plants", publishedAt: "2026-04-30" }),
  ];

  it("prefers the same category, newest first, excluding the current post", () => {
    expect(relatedPosts(pool, current, 3).map((entry) => entry.slug)).toEqual([
      "same-2",
      "same-1",
      "other",
    ]);
  });

  it("tops up from other categories only after same-category posts", () => {
    expect(relatedPosts(pool, current, 2).map((entry) => entry.slug)).toEqual([
      "same-2",
      "same-1",
    ]);
  });

  it("never includes drafts or the current post", () => {
    const withDraft = [...pool, post({ slug: "draft", status: "draft" })];
    expect(relatedPosts(withDraft, current, 5).map((entry) => entry.slug)).not.toContain("draft");
    expect(relatedPosts(withDraft, current, 5).map((entry) => entry.slug)).not.toContain("a");
  });
});

describe("adjacentPosts", () => {
  it("returns the neighbours in publication order", () => {
    const ordered = sortByNewest(visiblePosts(posts, false));
    expect(adjacentPosts(ordered, ordered[1])).toEqual({
      previous: ordered[0],
      next: ordered[2],
    });
  });

  it("returns null at the ends", () => {
    const ordered = sortByNewest(visiblePosts(posts, false));
    expect(adjacentPosts(ordered, ordered[0]).previous).toBeNull();
    expect(adjacentPosts(ordered, ordered[2]).next).toBeNull();
  });

  it("returns both null for a post that is not in the list", () => {
    expect(adjacentPosts([], post({ slug: "missing" }))).toEqual({
      previous: null,
      next: null,
    });
  });
});
