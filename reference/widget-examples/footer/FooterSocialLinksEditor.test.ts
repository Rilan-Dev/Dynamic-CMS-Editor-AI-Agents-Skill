import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "components/footer/FooterSocialLinksEditor.tsx",
  "utf8",
);

describe("inline social editor", () => {
  it("contains no popup-management implementation", () => {
    expect(source).not.toContain("Dialog");
    expect(source).not.toContain("Manage social links");
    expect(source).not.toContain("Switch");
    expect(source).not.toContain("createPortal");
  });

  it("uses the existing inline CMS interaction language", () => {
    expect(source).toContain("useCmsEditing");
    expect(source).toContain("InlineListControls");
    expect(source).toContain("moveListItem");
    expect(source).toContain('axis="horizontal"');
    expect(source).toContain('placement="inline"');
    expect(source).toContain("InlineAddIcon");
    expect(source).toContain("cms-footer-inline-input");
  });

  it("expands the platform selector in normal footer flow", () => {
    expect(source).toContain("cms-footer-social-add-tray");
    expect(source).toContain("expanded={addOpen}");
    expect(source).toContain('controls="cms-footer-social-add-tray"');
    expect(source).toContain("setAddOpen(false)");
  });

  it("allows a newly added disabled empty link until enablement", () => {
    expect(source).toContain("!trimmed && !entry.enabled");
    expect(source).toContain("validateSocialHref");
    expect(source).toContain("cms-footer-inline-error");
  });

  it("uses collision-safe IDs and keeps invalid rows removable", () => {
    expect(source).toContain("createCmsItemId");
    expect(source).toContain("Unsupported platform");
    expect(source).toContain("Remove the duplicate before publishing");
    expect(source).toContain("removeAt(index)");
  });
});
