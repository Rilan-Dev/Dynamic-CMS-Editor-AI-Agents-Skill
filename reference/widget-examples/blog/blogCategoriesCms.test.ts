import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const filters = readFileSync("components/blog/BlogFilters.tsx", "utf8");
const listPage = readFileSync("components/pages/BlogsPage.tsx", "utf8");
const postPage = readFileSync("components/pages/BlogPostPage.tsx", "utf8");
const card = readFileSync("components/blog/BlogCard.tsx", "utf8");

describe("blog categories are CMS-editable, like project categories", () => {
  it("renames pills in place and edits the All label", () => {
    expect(filters).toContain('<E path={["categories", index, "label"]} value={label} as="span" />');
    expect(filters).toContain('<E path={["search", "allLabel"]} value={allLabel} as="span" />');
  });

  it("adds a category with a slug derived once from the typed name, rejecting duplicates", () => {
    expect(filters).toContain("const slug = blogSlug(label);");
    expect(filters).toContain('setError("That category already exists.")');
    expect(filters).toContain('{ id: createCmsItemId("category"), slug, label: label.trim(), visible: true }');
    expect(filters).toContain("{editActive && <AddCategoryControl categories={categories} />}");
  });

  it("removes a category, confirming first when articles still use it", () => {
    expect(filters).toContain("<ERemove");
    expect(filters).toContain("const used = usage.get(text(category.slug)) ?? 0;");
    expect(filters).toContain("window.confirm(");
  });

  it("shows visitors only visible categories, editors all of them", () => {
    expect(filters).toContain(
      "editActive || (category.visible !== false && !!text(category.slug))",
    );
  });

  it("feeds the filters the raw document list and real usage counts", () => {
    expect(listPage).toContain("categories={rawCategories}");
    expect(listPage).toContain("usage={categoryUsage}");
  });

  it("shows category labels, not slugs, on cards and articles", () => {
    expect(listPage).toContain("categoryLabel={categoryLabels.get(post.category)}");
    expect(card).toContain("{categoryLabel || post.category}");
    expect(postPage).toContain("{categoryLabel}");
    expect(postPage).not.toContain('<E path={["category"]}');
  });

  it("picks an article's category from the live blog categories", () => {
    expect(postPage).toContain('useDocumentBySlug<JsonObject | null>("blogs", null)');
    expect(postPage).toContain('onChange={(event) => setPath(["category"], event.target.value)}');
  });
});
