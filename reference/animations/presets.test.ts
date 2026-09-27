import { describe, expect, it } from "vitest";
import { animationDefinition } from "./presets";
import { DEFAULT_ANIMATION_CONFIG } from "./types";

const config = () => ({
  ...DEFAULT_ANIMATION_CONFIG,
  timing: {
    ...DEFAULT_ANIMATION_CONFIG.timing,
    spring: { ...DEFAULT_ANIMATION_CONFIG.timing.spring },
  },
  viewport: { ...DEFAULT_ANIMATION_CONFIG.viewport },
  devices: { ...DEFAULT_ANIMATION_CONFIG.devices },
  transform: { ...DEFAULT_ANIMATION_CONFIG.transform },
  sequence: [],
});

describe("animationDefinition", () => {
  it("uses the configured parallax strength in both directions", () => {
    const value = config();
    value.viewport.parallaxStrength = 72;

    const definition = animationDefinition("parallax", value);

    expect(definition?.keyframes[0]).toMatchObject({
      transform: "translate3d(0, 72px, 0)",
    });
    expect(definition?.keyframes[1]).toMatchObject({
      transform: "translate3d(0, -72px, 0)",
    });
  });

  it("maps repeat forever to infinite Web Animation iterations", () => {
    const value = config();
    value.timing.repeat = "infinite";

    expect(animationDefinition("pulse", value)?.options.iterations).toBe(Infinity);
  });

  it("returns no animation for disabled or none presets", () => {
    const disabled = config();
    disabled.enabled = false;

    expect(animationDefinition("fade", disabled)).toBeNull();
    expect(animationDefinition("none", config())).toBeNull();
  });
});
