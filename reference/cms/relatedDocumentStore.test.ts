import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/cms/store.ts", "utf8");

describe("related Services document loading", () => {
  it("loads Services draft and published snapshots with edit mode", () => {
    expect(source).toContain('const RELATED_DOCUMENT_SLUGS = ["services"]');
    expect(source).toContain("resolveDraft(relatedSlug)");
    expect(source).toContain("resolvePublished(relatedSlug)");
  });

  it("exports a view-aware slug hook", () => {
    expect(source).toContain("export function useDocumentBySlug");
    expect(source).toContain("state.docs[slug]");
    expect(source).toContain("state.publishedDocs[slug]");
  });

  it("discards every dirty related document after page navigation", () => {
    expect(source).toContain("Object.entries(state.dirty)");
    expect(source).toContain("if (dirty) slugs.add(slug)");
    expect(source).toContain("for (const slug of slugs)");
  });
});
