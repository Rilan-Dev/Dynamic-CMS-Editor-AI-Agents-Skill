import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "components/footer/FooterServicePicker.tsx",
  "utf8",
);

describe("inline footer service editor", () => {
  it("contains no dialog or drag management UI", () => {
    expect(source).not.toContain("Dialog");
    expect(source).not.toContain("Choose services");
    expect(source).not.toContain("DndContext");
    expect(source).not.toContain("SortableContext");
    expect(source).not.toContain("useSortable");
    expect(source).not.toContain("GripVertical");
  });

  it("uses the existing inline CMS interaction language", () => {
    expect(source).toContain("useCmsEditing");
    expect(source).toContain("InlineListControls");
    expect(source).toContain("moveListItem");
    expect(source).toContain('axis="vertical"');
    expect(source).toContain('placement="inline"');
    expect(source).toContain("InlineAddIcon");
    expect(source).toContain("MAX_FOOTER_SERVICES");
  });

  it("uses an in-flow search tray without service creation", () => {
    expect(source).toContain("cms-footer-service-add-tray");
    expect(source).toContain("Search existing services");
    expect(source).toContain("unselectedServices");
    expect(source).toContain("filteredServices");
    expect(source).not.toContain("createCmsItemId");
    expect(source).not.toContain("New Service");
  });

  it("keeps malformed and unavailable rows independently removable", () => {
    expect(source).toContain("selectionKey");
    expect(source).toContain("Service unavailable");
    expect(source).toContain("Invalid stored value");
    expect(source).toContain("removeAt(index)");
  });

  it("keeps an open search tray closable after zero results", () => {
    expect(source).toContain("unselectedServices.length === 0");
    expect(source).toContain("filteredServices.length === 0");
    expect(source).toContain("setAddOpen((open) => !open)");
  });
});
