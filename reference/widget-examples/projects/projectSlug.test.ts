import { describe, expect, it } from "vitest";
import {
  PROJECT_SLUG_PATTERN,
  isProjectDocument,
  projectDocumentName,
  projectSlug,
  projectSlugFromDocument,
} from "./projectSlug";

describe("projectSlug", () => {
  it("derives a URL-safe slug from a title", () => {
    expect(projectSlug("Warehouse Fit-Out — Jebel Ali (Phase 2)")).toBe(
      "warehouse-fit-out-jebel-ali-phase-2",
    );
  });

  it("never returns an empty slug", () => {
    expect(projectSlug("—")).toBe("project");
  });

  it("caps length without leaving a trailing hyphen", () => {
    const slug = projectSlug(`${"a".repeat(63)} b`);
    expect(slug.length).toBeLessThanOrEqual(64);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("produces slugs the validator accepts", () => {
    expect(PROJECT_SLUG_PATTERN.test(projectSlug("Villa 12, Al Barsha"))).toBe(true);
  });
});

describe("project document names", () => {
  it("round-trips a slug through its document name", () => {
    const name = projectDocumentName("villa-12");
    expect(name).toBe("project-villa-12");
    expect(isProjectDocument(name)).toBe(true);
    expect(projectSlugFromDocument(name)).toBe("villa-12");
  });

  it("rejects the bare prefix and other documents", () => {
    expect(isProjectDocument("project-")).toBe(false);
    expect(isProjectDocument("projects")).toBe(false);
    expect(isProjectDocument("blog-villa")).toBe(false);
    expect(projectSlugFromDocument("projects")).toBeNull();
  });
});
