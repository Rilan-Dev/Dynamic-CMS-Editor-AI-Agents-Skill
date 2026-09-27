import { expect, it } from "vitest";
import { createUndoReceipt } from "./undo";

it("captures previous and next values for every affected path", () => {
  const receipt = createUndoReceipt("Apply to 2 buttons", [
    {
      document: "page",
      path: ["animations", "components", "a"],
      previousValue: null,
      nextValue: { preset: "pulse" },
    },
  ]);
  expect(receipt.label).toBe("Apply to 2 buttons");
  expect(receipt.changes[0]?.previousValue).toBeNull();
});
