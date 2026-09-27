import { expect, it } from "vitest";
import { createPreviewStore } from "./preview-state";

it("temporary preview overrides draft and restores it without mutation", () => {
  const store = createPreviewStore();
  const draft = { preset: "fade" } as const;
  store.set("component:hero:button", { preset: "pulse" });
  expect(store.resolve("component:hero:button", draft)).toEqual({ preset: "pulse" });
  store.clear("component:hero:button");
  expect(store.resolve("component:hero:button", draft)).toBe(draft);
});
