import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("animation editor accessibility wiring", () => {
  it("keeps every sparkle badge keyboard reachable before hover", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/animation-editor/runtime/AnimationTargetOverlay.tsx"),
      "utf8",
    );
    expect(source).toContain("data-visible={visible || open}");
    expect(source).toContain("onFocus={() =>");
    expect(source).not.toContain("{(visible || open) && (");
  });

  it("traps keyboard navigation inside the open popover", () => {
    const popover = readFileSync(
      resolve(process.cwd(), "components/animation-editor/ui/AnimationPopover.tsx"),
      "utf8",
    );
    const focusHook = readFileSync(
      resolve(process.cwd(), "components/animation-editor/runtime/usePopoverFocus.ts"),
      "utf8",
    );
    expect(popover).toContain("usePopoverFocus(rootRef, onClose)");
    expect(popover).toContain("data-ae-initial-focus");
    expect(focusHook).toContain('event.key !== "Tab"');
    expect(focusHook).toContain('event.key === "Escape"');
  });
});
