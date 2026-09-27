import { expect, it } from "vitest";
import { createPreviewStore } from "../core/preview-state";

it("keeps preview state isolated from draft configuration", () => {
  const store = createPreviewStore();
  const draft = { preset: "fade" } as const;
  store.set("component:hero:button", { preset: "pulse" });
  expect(store.resolve("component:hero:button", draft).preset).toBe("pulse");
  expect(draft.preset).toBe("fade");
});
