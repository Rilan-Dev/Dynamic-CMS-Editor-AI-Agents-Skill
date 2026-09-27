import { afterEach, expect, it } from "vitest";
import {
  clearAnimationTargets,
  getTargetById,
  getTargetsByType,
  registerAnimationTarget,
} from "./targetRegistry";

afterEach(clearAnimationTargets);

it("stores the real target element for on-page editing", () => {
  const element = { tagName: "BUTTON" } as unknown as HTMLElement;
  registerAnimationTarget({
    id: "component:hero:button",
    type: "button",
    label: "Quote button",
    pageId: "home",
    sectionId: "hero",
    element,
  });
  expect(getTargetById("component:hero:button")?.element).toBe(element);
  expect(getTargetsByType("button")).toHaveLength(1);
});
