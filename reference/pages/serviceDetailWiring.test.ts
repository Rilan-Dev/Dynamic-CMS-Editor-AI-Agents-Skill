import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("components/pages/ServiceDetailPage.tsx", "utf8");
const controls = readFileSync(
  "components/services/detail/InheritedSectionControls.tsx",
  "utf8",
);

describe("ServiceDetailPage", () => {
  it("reads the services document through the CMS store", () => {
    expect(page).toMatch(/useSection\(\s*\["services"\]/);
    expect(page).toContain('"use client"');
  });

  it("builds parent and child detail paths absolutely", () => {
    expect(page).toContain('["services", parentIndex, "detail"]');
    expect(page).toContain(
      '["services", parentIndex, "children", childIndex, "detail"]',
    );
  });

  it("resolves each section through the inheritance rule", () => {
    expect(page).toContain("resolveDetailSection(");
    expect(page).toContain("DETAIL_SECTION_KEYS");
  });

  it("renders every section component", () => {
    for (const component of [
      "ServiceDetailHero",
      "ServiceSpecialists",
      "ServiceAbout",
      "ServiceProcess",
      "ServiceApplications",
      "ServiceWhyChoose",
      "ServiceProjects",
      "ServiceFaq",
      "ServiceCta",
    ]) {
      expect(page, component).toContain(component);
    }
  });

  it("links a sub-service page back to its parent", () => {
    expect(page).toContain("Part of ");
    expect(page).toContain("serviceHref({ slug: String(parent.slug");
  });

  it("still shows the line-up when the About section is hidden", () => {
    expect(page).toContain("{!aboutVisible && specialists}");
  });

  it("skips a section that is hidden or absent", () => {
    expect(page).toContain("section.visible === false");
  });

  it("wraps the page for the animation editor", () => {
    expect(page).toContain("<AnimatedPage");
    expect(page).toContain('id="serviceDetail"');
  });
});

describe("InheritedSectionControls", () => {
  it("uses the existing add and remove primitives, not a new control", () => {
    expect(controls).toContain("<EAdd");
    expect(controls).toContain("<ERemove");
    expect(controls).not.toContain("<button");
  });

  it("clones the parent section when customising", () => {
    expect(controls).toContain("structuredClone");
    expect(controls).toContain("setPath");
  });

  it("only appears while editing a sub-service", () => {
    expect(controls).toContain("editActive");
    expect(controls).toContain("childIndex");
  });
});
