import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("friendly page transition editor wiring", () => {
  it("shows transition choices only on the page animation target", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/animation-editor/ui/AnimationPopover.tsx"),
      "utf8",
    );
    expect(source).toContain('target.type === "page"');
    expect(source).toContain("<PageTransitionEditor />");
  });

  it("writes transition choices to the shared site draft", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/cms/animation/SmtsAnimationEditorAdapter.ts"),
      "utf8",
    );
    expect(source).toContain('["animations", "pageTransition"]');
    expect(source).toContain("savePageTransition");
    expect(source).toContain('setPath(\n        [...PAGE_TRANSITION_PATH]');
    expect(source).toContain('"site"');
  });

  it("previews against the real page transition root without navigating", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/cms/animation/SmtsAnimationEditorAdapter.ts"),
      "utf8",
    );
    expect(source).toContain('[data-page-transition-root]');
    expect(source).toContain("root.animate");
    expect(source).not.toContain("router.push");
    expect(source).not.toContain("window.location");
  });
});
