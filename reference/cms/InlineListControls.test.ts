import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  duplicateListItem,
  moveListItem,
  removeListItem,
  toggleListItemVisibility,
} from "./InlineListControls";

const controls = readFileSync("components/cms/InlineListControls.tsx", "utf8");
const addControl = readFileSync("components/cms/InlineAddControl.tsx", "utf8");

const items = [
  { id: "a", title: "A", visible: true },
  { id: "b", title: "B", visible: true },
  { id: "c", title: "C", visible: false },
];

describe("inline list helpers", () => {
  it("moves items without changing their stable IDs", () => {
    expect(moveListItem(items, 0, 2).map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("duplicates after the source with a new ID", () => {
    const result = duplicateListItem(items, 1, "new-id");
    expect(result.map((item) => item.id)).toEqual(["a", "b", "new-id", "c"]);
    expect(result[2]).toMatchObject({ title: "B", visible: true });
  });

  it("removes only the selected item", () => {
    expect(removeListItem(items, 1).map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("toggles visibility immutably", () => {
    const result = toggleListItemVisibility(items, 2);
    expect(result[2].visible).toBe(true);
    expect(items[2].visible).toBe(false);
  });
});

describe("reusable inline CMS controls", () => {
  it("supports horizontal and in-flow action bars", () => {
    expect(controls).toContain('axis = "vertical"');
    expect(controls).toContain('placement = "overlay"');
    expect(controls).toContain("showPosition = true");
    expect(controls).toContain('axis === "horizontal" ? ArrowLeft : ArrowUp');
    expect(controls).toContain('placement === "inline"');
    expect(controls).toContain("onDuplicate?: () => void");
    expect(controls).toContain("onToggleVisibility?: () => void");
    expect(controls).toContain("onRemove?: () => void");
  });

  it("supports an accessible icon-only add control", () => {
    expect(addControl).toContain("useCmsEditing");
    expect(addControl).toContain("disabled = false");
    expect(addControl).toContain("aria-expanded={expanded}");
    expect(addControl).toContain("aria-controls={controls}");
    expect(addControl).toContain('className="cms-add cms-add--icon-only"');
    expect(addControl).toContain("if (!editing || !ready) return null");
  });
});
