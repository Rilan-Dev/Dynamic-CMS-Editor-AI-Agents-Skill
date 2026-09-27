import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "components/animations/AnimatedPage.tsx",
  "components/animations/AnimatedSection.tsx",
  "components/animations/AnimatedElement.tsx",
];

describe("on-canvas animation target wiring", () => {
  it.each(files)("renders the edit-mode target slot in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).toContain("EditableAnimationTarget");
    expect(source).toContain("element: ref.current");
    expect(source).toContain("data-animation-target");
    expect(source).not.toContain('from "@/components/animation-editor"');
  });

  it("loads the visual overlay only after draft edit mode is active", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/animations/EditableAnimationTarget.tsx"),
      "utf8",
    );
    expect(source).toContain("dynamic(");
    expect(source).toContain("AnimationTargetOverlay");
    expect(source).toContain("if (!editing || !ready) return null");
  });

  it("mounts the SMTS adapter provider around the rendered site", () => {
    const source = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
    expect(source).toContain("SmtsAnimationEditorProvider");
    expect(source).toContain("animation-editor.css");
  });
});
