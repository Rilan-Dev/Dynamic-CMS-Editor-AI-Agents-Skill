import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pages = [
  "HomePage.tsx",
  "AboutPage.tsx",
  "ServicesPage.tsx",
  "CertificationsPage.tsx",
  "ContactPage.tsx",
];

const source = (name: string) =>
  readFileSync(resolve(process.cwd(), "components/pages", name), "utf8");

describe("page animation target wiring", () => {
  it.each(pages)("registers page, section and component scopes in %s", (page) => {
    const contents = source(page);
    expect(contents).toContain("<AnimatedPage");
    expect(contents).toContain("<AnimatedSection");
    expect(contents).toContain("<AnimatedElement");
    expect(contents).toContain('useSection(["animations"]');
  });

  it("uses normalized stable IDs for reorderable content", () => {
    expect(source("HomePage.tsx")).toContain("service.id");
    expect(source("AboutPage.tsx")).toContain("company.id");
    expect(source("ServicesPage.tsx")).toContain("service.id");
    expect(source("CertificationsPage.tsx")).toContain("certificate.id");
    expect(source("ContactPage.tsx")).toContain("card.id");
  });
});
