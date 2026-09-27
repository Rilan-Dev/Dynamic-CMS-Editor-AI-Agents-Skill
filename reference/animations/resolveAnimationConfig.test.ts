import { describe, expect, it } from "vitest";
import { resolveAnimationConfig } from "./resolveAnimationConfig";

describe("resolveAnimationConfig", () => {
  it("merges nested properties from global through component", () => {
    const resolved = resolveAnimationConfig(
      [
        {
          mode: "override",
          preset: "fade-up",
          timing: { durationMs: 600, easing: "ease-out" },
          devices: { desktop: true, tablet: true, mobile: true, reducedMotion: "disable" },
        },
        { mode: "override", timing: { delayMs: 100 } },
        { mode: "override", viewport: { once: true } },
        { mode: "override", preset: "slide-left" },
      ],
      "desktop",
      false,
    );

    expect(resolved).toMatchObject({
      enabled: true,
      preset: "slide-left",
      timing: {
        durationMs: 600,
        delayMs: 100,
        easing: "ease-out",
      },
      viewport: { once: true },
    });
  });

  it("disables motion when the most specific scope is disabled", () => {
    const resolved = resolveAnimationConfig(
      [
        { mode: "override", preset: "fade" },
        { mode: "disabled" },
      ],
      "desktop",
      false,
    );

    expect(resolved.enabled).toBe(false);
  });

  it("combines a child animation after inherited motion", () => {
    const resolved = resolveAnimationConfig(
      [
        { mode: "override", preset: "fade-up" },
        { mode: "combine", preset: "pulse", timing: { durationMs: 300 } },
      ],
      "desktop",
      false,
    );

    expect(resolved.preset).toBe("fade-up");
    expect(resolved.sequence.at(-1)).toMatchObject({
      preset: "pulse",
      timing: { durationMs: 300 },
    });
  });

  it("applies a fade fallback for reduced motion", () => {
    const resolved = resolveAnimationConfig(
      [
        {
          mode: "override",
          preset: "slide-left",
          devices: { reducedMotion: "fade" },
        },
      ],
      "desktop",
      true,
    );

    expect(resolved.enabled).toBe(true);
    expect(resolved.preset).toBe("fade");
    expect(resolved.sequence).toEqual([]);
  });

  it("disables motion on excluded devices", () => {
    const resolved = resolveAnimationConfig(
      [
        {
          mode: "override",
          preset: "fade",
          devices: { desktop: true, tablet: true, mobile: false },
        },
      ],
      "mobile",
      false,
    );

    expect(resolved.enabled).toBe(false);
  });
});
