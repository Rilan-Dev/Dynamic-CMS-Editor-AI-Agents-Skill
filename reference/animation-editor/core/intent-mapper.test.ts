import { describe, expect, it } from "vitest";
import {
  deriveIntentDefaults,
  mapIntentToConfig,
  recognizeIntent,
} from "./intent-mapper";

describe("intent mapper", () => {
  it("maps Rise gently to safe non-technical defaults", () => {
    const config = mapIntentToConfig({
      intentId: "rise-gently",
      strength: "gentle",
      speed: "normal",
      delay: "none",
      repetition: "once",
    });
    expect(config.preset).toBe("fade-up");
    expect(config.trigger).toBe("in-view");
    expect(config.timing?.durationMs).toBe(600);
    expect(config.transform?.y).toBe(18);
  });

  it("recognizes unknown expert configs as custom without changing them", () => {
    const config = { preset: "fade-up", transform: { rotate: 13 } } as const;
    expect(recognizeIntent(config)).toEqual({ intentId: "custom", exact: false });
  });

  it("recognizes an empty scope as inherited", () => {
    expect(recognizeIntent({})).toEqual({ intentId: "inherited", exact: true });
  });

  it("maps continuous motion to infinite repetition", () => {
    const config = mapIntentToConfig({
      intentId: "float-softly",
      strength: "balanced",
      speed: "slow",
      delay: "slight",
      repetition: "continuous",
    });
    expect(config.timing?.repeat).toBe("infinite");
    expect(config.timing?.delayMs).toBe(120);
  });

  it("restores simple choices from a saved bold fast animation", () => {
    const choices = deriveIntentDefaults(
      {
        preset: "fade-up",
        trigger: "in-view",
        transform: { y: 56 },
        timing: { durationMs: 320, delayMs: 280, staggerMs: 160 },
        viewport: { replayOnReentry: true },
      },
      {
        strength: "gentle",
        speed: "normal",
        delay: "none",
        trigger: "in-view",
        repetition: "once",
      },
    );
    expect(choices).toMatchObject({
      strength: "bold",
      speed: "fast",
      delay: "noticeable",
      repetition: "on-reentry",
      stagger: "relaxed",
    });
  });
});
