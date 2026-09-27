import { describe, expect, it } from "vitest";
import {
  normalizePageTransitionConfig,
  pageTransitionConfig,
  pageTransitionSpeed,
} from "./page-transitions";

describe("page transition choices", () => {
  it("maps a fast soft fade to safe transition durations", () => {
    expect(pageTransitionConfig("fade", "fast")).toMatchObject({
      enabled: true,
      preset: "fade",
      enterDurationMs: 180,
      exitDurationMs: 120,
    });
  });

  it("turns No page transition into a disabled draft config", () => {
    expect(pageTransitionConfig("none", "normal").enabled).toBe(false);
  });

  it("restores a simple speed from an existing config", () => {
    expect(pageTransitionSpeed({ enterDurationMs: 520 })).toBe("slow");
    expect(pageTransitionSpeed({ enterDurationMs: 180 })).toBe("fast");
  });

  it("normalizes unknown legacy values without losing safe defaults", () => {
    expect(normalizePageTransitionConfig({ preset: "unknown", enabled: true })).toMatchObject({
      preset: "fade",
      enabled: true,
      reducedMotion: "disable",
    });
  });
});
