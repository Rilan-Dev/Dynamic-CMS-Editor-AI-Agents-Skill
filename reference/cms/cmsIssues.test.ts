import { describe, expect, it } from "vitest";
import {
  cmsPathKey,
  groupIssues,
  issueLocation,
  issueScope,
  removableFooterSelection,
} from "./cmsIssues";
import type { CmsValidationError } from "./documentValidation";

const issue = (overrides: Partial<CmsValidationError>): CmsValidationError => ({
  code: "unsafe-url",
  path: [],
  message: "m",
  ...overrides,
});

describe("issueLocation", () => {
  it("reads a path the way an editor would", () => {
    expect(issueLocation(["footer", "selectedServiceIds", 1])).toBe("Footer › Footer services › #2");
    expect(issueLocation(["hero", "primaryButtonHref"])).toBe("Hero › Primary Button Href");
    expect(issueLocation([])).toBe("Whole document");
  });
});

describe("grouping and scope", () => {
  it("groups page issues first, then site-wide, then related documents", () => {
    const groups = groupIssues(
      [
        issue({ document: "services", message: "s" }),
        issue({ document: "site", message: "f" }),
        issue({ document: "page", message: "p" }),
      ],
      "about",
    );
    expect(groups.map((group) => group.label)).toEqual([
      "This page (about)",
      "Site-wide (navbar, footer & theme)",
      "Services document",
    ]);
  });

  it("maps a document to the editor scope its fields are marked with", () => {
    expect(issueScope(issue({ document: "site" }))).toBe("site");
    expect(issueScope(issue({}))).toBe("page");
    expect(issueScope(issue({ document: "services" }))).toBe("doc:services");
    expect(cmsPathKey("site", ["footer", "selectedServiceIds", 0])).toBe(
      "site:footer.selectedServiceIds.0",
    );
  });
});

describe("removableFooterSelection", () => {
  it("offers a one-click removal for a footer service reference", () => {
    expect(
      removableFooterSelection(
        issue({
          code: "unpublished-service-reference",
          document: "site",
          path: ["footer", "selectedServiceIds", 3],
        }),
      ),
    ).toBe(3);
  });

  it("offers nothing for other issues", () => {
    expect(removableFooterSelection(issue({ document: "site", path: ["navbar", "links", 0, "href"] }))).toBeNull();
  });
});
