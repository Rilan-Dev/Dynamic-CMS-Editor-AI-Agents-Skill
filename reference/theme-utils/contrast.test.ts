import { describe, expect, it } from "vitest";
import { contrastRatio, hslToRgb, relativeLuminance } from "./contrast";

describe("hslToRgb", () => {
  it("converts the brand green", () => {
    // green-700 #15803d
    expect(hslToRgb(142.4, 71.8, 29.2)).toEqual([21, 128, 61]);
  });

  it("converts pure white and black", () => {
    expect(hslToRgb(0, 0, 100)).toEqual([255, 255, 255]);
    expect(hslToRgb(0, 0, 0)).toEqual([0, 0, 0]);
  });
});

describe("relativeLuminance", () => {
  it("is 1 for white and 0 for black", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white", () => {
    expect(contrastRatio("0 0% 0%", "0 0% 100%")).toBeCloseTo(21, 1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("142.4 71.8% 29.2%", "0 0% 100%")).toBeCloseTo(
      contrastRatio("0 0% 100%", "142.4 71.8% 29.2%"),
      5,
    );
  });

  it("measures brand green on a dark surface as failing AA", () => {
    // This is why the brand token must lighten in dark mode rather than
    // being reused from light mode. Measured, not assumed.
    expect(contrastRatio("142.4 71.8% 29.2%", "150 8% 7%")).toBeLessThan(4.5);
  });

  it("measures the dark-mode brand green as passing AA", () => {
    // Gold #d4a547 on the charcoal background of the default dark preset.
    expect(contrastRatio("40 62.1% 55.5%", "202.5 21.1% 7.5%")).toBeGreaterThan(4.5);
  });
});
