import { describe, expect, it } from "vitest";
import type { JsonObject } from "./json";
import {
  applyAnimationToKeys,
  applyAnimationToSimilarTargets,
  resetAnimationAtKey,
} from "./animationApply";

const config = {
  mode: "override",
  preset: "fade-up",
  timing: { durationMs: 700 },
} as JsonObject;

describe("animation bulk operations", () => {
  it("applies cloned settings to selected keys and preserves unrelated data", () => {
    const record = {
      first: { preset: "none" },
      untouched: { preset: "slide-left" },
    } as JsonObject;
    const next = applyAnimationToKeys(record, ["first", "second"], config);

    expect(next.first).toEqual(config);
    expect(next.second).toEqual(config);
    expect(next.untouched).toEqual({ preset: "slide-left" });
    expect(next.first).not.toBe(next.second);
  });

  it("applies only to matching target types", () => {
    const next = applyAnimationToSimilarTargets(
      {},
      [
        { id: "a", type: "card", label: "A", pageId: "test-page" },
        { id: "b", type: "heading", label: "B", pageId: "test-page" },
        { id: "c", type: "card", label: "C", pageId: "test-page" },
      ],
      "card",
      config,
    );

    expect(Object.keys(next)).toEqual(["a", "c"]);
  });

  it("resets a key to inherited behavior", () => {
    const next = resetAnimationAtKey(
      { a: config, b: { preset: "fade" } } as JsonObject,
      "a",
    );
    expect(next.a).toEqual({ mode: "inherit" });
    expect(next.b).toEqual({ preset: "fade" });
  });
});
