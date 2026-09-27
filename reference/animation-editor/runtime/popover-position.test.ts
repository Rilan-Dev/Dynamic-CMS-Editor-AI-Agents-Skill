import { expect, it } from "vitest";
import { calculatePopoverPosition } from "./popover-position";

it("moves the popover above a target near the bottom of the viewport", () => {
  const result = calculatePopoverPosition(
    { top: 700, bottom: 740, left: 900, right: 980, width: 80, height: 40 },
    { width: 1024, height: 768 },
    { width: 360, height: 420 },
  );
  expect(result.placement).toBe("above");
  expect(result.left).toBeGreaterThanOrEqual(12);
  expect(result.left + 360).toBeLessThanOrEqual(1012);
});

it("places the popover below when sufficient space exists", () => {
  const result = calculatePopoverPosition(
    { top: 100, bottom: 140, left: 100, right: 180, width: 80, height: 40 },
    { width: 1024, height: 768 },
    { width: 360, height: 300 },
  );
  expect(result.placement).toBe("below");
  expect(result.top).toBe(148);
});
