import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { readThemeTokens } from "./tokens";

const { light, dark } = readThemeTokens();

describe("theme tokens", () => {
  it("defines the same token names in both modes", () => {
    // A token defined only in :root silently keeps its light value in dark
    // mode — the most common way a dark theme ends up half-broken.
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it("defines the brand family", () => {
    for (const name of ["brand", "brand-strong", "brand-soft", "brand-contrast"]) {
      expect(light).toHaveProperty(name);
      expect(dark).toHaveProperty(name);
    }
  });

  it("keeps body copy readable in both modes", () => {
    for (const mode of [light, dark]) {
      expect(contrastRatio(mode["muted-foreground"], mode.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(mode.foreground, mode.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(mode.foreground, mode.card)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps brand text readable on page and card surfaces", () => {
    for (const mode of [light, dark]) {
      expect(contrastRatio(mode.brand, mode.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(mode.brand, mode.card)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps label text readable on a brand fill", () => {
    for (const mode of [light, dark]) {
      expect(contrastRatio(mode["brand-contrast"], mode.brand)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the inverse band readable", () => {
    for (const mode of [light, dark]) {
      expect(contrastRatio(mode["inverse-foreground"], mode.inverse)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("points --primary at the brand, not at stock shadcn blue", () => {
    expect(light.primary).toBe(light.brand);
    expect(dark.primary).toBe(dark.brand);
  });
});
