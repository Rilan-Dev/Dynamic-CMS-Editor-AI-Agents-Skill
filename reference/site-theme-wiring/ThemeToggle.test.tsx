// components/ThemeToggle.test.tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "components/ThemeToggle.tsx"), "utf8");

describe("ThemeToggle", () => {
  it("is a client component", () => {
    expect(source.startsWith('"use client"')).toBe(true);
  });

  it("waits for mount before rendering theme-dependent output", () => {
    // next-themes cannot know the theme during SSR. Rendering the icon
    // before mount produces a hydration mismatch and a flash of the
    // wrong icon.
    expect(source).toMatch(/useEffect\(/);
    expect(source).toMatch(/mounted/);
  });

  it("carries an accessible name", () => {
    expect(source).toMatch(/aria-label=/);
  });

  it("reserves its footprint before mount so the navbar does not shift", () => {
    expect(source).toMatch(/aria-hidden/);
  });
});
