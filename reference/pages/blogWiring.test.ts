import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const listRoute = read("app/blogs/page.tsx");
const postRoute = read("app/blogs/[slug]/page.tsx");
const listPage = read("components/pages/BlogsPage.tsx");
const postPage = read("components/pages/BlogPostPage.tsx");
const body = read("components/blog/BlogBody.tsx");
const block = read("components/blog/blocks/BlogBlock.tsx");
const addPost = read("components/blog/AddPostControl.tsx");
const store = read("components/cms/store.ts");

describe("blog routes", () => {
  it("reads the index and every published post in one query", () => {
    expect(listRoute).toContain('listPublishedByPrefix("blog-")');
    expect(listRoute).toContain("buildPost(");
    expect(postRoute).toContain("blogDocumentName(slug)");
  });

  it("wraps the URL-driven listing in a Suspense boundary", () => {
    expect(listRoute).toContain("<Suspense");
  });

  it("404s an unknown article and hides unpublished ones from search engines", () => {
    expect(postRoute).toContain("notFound()");
    expect(postRoute).toContain('post.status !== "published"');
  });

  it("gives each article canonical metadata and Article structured data", () => {
    expect(postRoute).toContain("alternates: { canonical: `/blogs/${slug}` }");
    expect(postRoute).toContain('"@type": "Article"');
    expect(postRoute).toContain("datePublished");
  });
});

describe("blog listing page", () => {
  it("keeps hero copy editable", () => {
    expect(listPage).toContain('path={["hero", "title"]}');
    expect(listPage).toContain('path={["hero", "subtitle"]}');
  });

  it("drives category and search from the URL", () => {
    expect(listPage).toContain("useSearchParams");
    expect(listPage).toContain("router.replace");
    expect(listPage).toContain('searchParams?.get("category")');
    expect(listPage).toContain('searchParams?.get("q")');
  });

  it("switches the heading for category and search states", () => {
    expect(listPage).toContain("Blog Category:");
    expect(listPage).toContain("Search Results");
  });

  it("filters, sorts and pages with the shared helpers", () => {
    for (const helper of ["visiblePosts", "sortByNewest", "filterPosts", "pageItems", "pageCount"]) {
      expect(listPage, helper).toContain(helper);
    }
  });

  it("loads unpublished roster posts through the authenticated API while editing", () => {
    // Drafts must never arrive in the public page payload.
    expect(listPage).toContain("CmsService.getEntry(");
    expect(listPage).toContain("if (!showDrafts) return");
  });

  it("offers the add-post control and an empty state", () => {
    expect(listPage).toContain("<AddPostControl");
    expect(listPage).toContain("No articles");
  });
});

describe("blog article page", () => {
  it("edits every post field at the document root", () => {
    for (const path of ['["title"]', '["excerpt"]', '["author"]', '["publishedAt"]', '["image"]']) {
      expect(postPage, path).toContain(`path={${path}}`);
    }
    expect(postPage).toContain('storedAs="string"');
  });

  it("renders the body through the block editor", () => {
    expect(postPage).toContain("<BlogBody");
    expect(postPage).toContain('basePath={["body"]}');
  });

  it("shows related posts, category counts and prev/next", () => {
    expect(postPage).toContain("relatedPosts(");
    expect(postPage).toContain("categoryCounts(");
    expect(postPage).toContain("adjacentPosts(");
  });

  it("lets the editor see and change whether the post is listed", () => {
    expect(postPage).toContain("<PostStatusControl");
    expect(postPage).toContain("status={String(status)}");
  });
});

describe("body blocks", () => {
  it("covers every supported block type", () => {
    for (const type of ["heading", "paragraph", "bulletList", "checklist", "quote", "image", "callout"]) {
      expect(block, type).toContain(`case "${type}"`);
    }
    expect(block).toContain("default:");
  });

  it("binds block fields by index and stores images as strings", () => {
    expect(block).toContain('path={[...basePath, index, "text"]}');
    expect(block).toContain('path={[...basePath, index, "items", itemIndex]}');
    expect(block).toContain('storedAs="string"');
  });

  it("adds and removes blocks with the existing controls", () => {
    expect(body).toContain("<EAdd");
    expect(body).toContain("<ERemove");
    expect(body).toContain("BLOCK_TYPES.map");
  });
});

describe("creating a post", () => {
  it("derives a slug, extends the roster and opens the new post in edit mode", () => {
    expect(addPost).toContain("blogSlug(");
    expect(addPost).toContain("setPath(indexPath");
    expect(addPost).toContain("?edit=1");
    expect(addPost).toContain("taken");
  });

  it("routes /blogs/<slug> to its own document", () => {
    expect(store).toContain("blogDocumentName(second)");
    expect(store).toContain("isBlogDocument(slug)");
  });
});

describe("post lifecycle defects found in browser testing", () => {
  const addPostSource = readFileSync("components/blog/AddPostControl.tsx", "utf8");
  const statusControl = readFileSync("components/blog/PostStatusControl.tsx", "utf8");
  const articleRoute = readFileSync("app/blogs/[slug]/page.tsx", "utf8");

  it("writes the typed title into the new document", () => {
    // Without this the post loads the blank template and is called
    // "New Article", losing what the editor typed.
    expect(addPostSource).toContain("CmsService.saveDraft(");
    expect(addPostSource).toContain("defaultBlogPost({ title: title.trim()");
  });

  it("gives the editor a way to list or unlist a post", () => {
    // Publishing the document alone leaves status "draft", so the article
    // would never appear for visitors.
    expect(statusControl).toContain('setPath(["status"]');
    expect(statusControl).toContain("published");
    expect(statusControl).toContain("draft");
  });

  it("hides an unpublished article from anyone without a CMS session", () => {
    expect(articleRoute).toContain('post.status !== "published"');
    expect(articleRoute).toContain("hasCmsSessionCookie(");
    expect(articleRoute).toContain("notFound()");
  });
});
