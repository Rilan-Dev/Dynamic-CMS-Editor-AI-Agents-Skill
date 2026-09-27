import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "components/animation-editor");

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx")
      ? [path]
      : [];
  });

describe("reusable animation editor portability", () => {
  it("does not import any SMTS project implementation", () => {
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(
        /@\/components\/(cms|animations)|@\/lib\/services|@\/content\/registry/,
      );
      expect(source, file).not.toMatch(/useAnimationRuntime|targetRegistry/);
    }
  });

  it("exports the complete public editor surface from one entry point", () => {
    const source = readFileSync(join(root, "index.ts"), "utf8");
    expect(source).toContain('export * from "./core/types"');
    expect(source).toContain('export * from "./core/page-transitions"');
    expect(source).toContain('export * from "./runtime/AnimationEditorProvider"');
    expect(source).toContain('export * from "./runtime/AnimationTargetOverlay"');
    expect(source).toContain('export * from "./ui/AnimationPopover"');
    expect(source).toContain('export * from "./ui/PageTransitionEditor"');
  });
});
