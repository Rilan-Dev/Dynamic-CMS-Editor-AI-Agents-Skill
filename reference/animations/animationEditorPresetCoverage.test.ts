import { describe, expect, it } from "vitest";
import { DEFAULT_ANIMATION_INTENTS } from "@/components/animation-editor/core/intents";
import { mapIntentToConfig } from "@/components/animation-editor/core/intent-mapper";
import { ANIMATION_PRESETS } from "./types";

describe("friendly animation editor runtime coverage", () => {
  it("offers at least one plain-language choice for every supported runtime preset", () => {
    const mappedPresets = new Set(
      DEFAULT_ANIMATION_INTENTS.map((intent) =>
        mapIntentToConfig({
          intentId: intent.id,
          strength: intent.defaults.strength,
          speed: intent.defaults.speed,
          delay: intent.defaults.delay,
          repetition: intent.defaults.repetition,
          trigger: intent.defaults.trigger,
          stagger: intent.defaults.stagger,
        }).preset,
      ),
    );

    expect(
      ANIMATION_PRESETS.filter((preset) => !mappedPresets.has(preset)),
    ).toEqual([]);
  });
});
