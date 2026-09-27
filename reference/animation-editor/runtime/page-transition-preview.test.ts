import { describe, expect, it } from "vitest";
import {
  pageTransitionKeyframes,
  reducedMotionPageTransition,
} from "./page-transition-preview";

const config = {
  enabled: true,
  preset: "slide-left" as const,
  easing: "ease-in-out",
  enterDurationMs: 320,
  exitDurationMs: 220,
  reducedMotion: "fade" as const,
};

describe("page transition preview", () => {
  it("uses directional frames for slide transitions", () => {
    expect(pageTransitionKeyframes("slide-left", "enter")[0]).toMatchObject({
      opacity: 0,
      transform: "translateX(3rem)",
    });
  });

  it("uses a short fade when reduced motion requests a fallback", () => {
    expect(reducedMotionPageTransition(config, true)).toMatchObject({
      enabled: true,
      preset: "fade",
      enterDurationMs: 140,
      exitDurationMs: 100,
    });
  });

  it("disables preview when reduced motion is disabled", () => {
    expect(
      reducedMotionPageTransition(
        { ...config, reducedMotion: "disable" },
        true,
      ),
    ).toMatchObject({ enabled: false, preset: "none" });
  });
});
