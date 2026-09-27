import { expect, it, vi } from "vitest";
import { createActivePopoverCoordinator } from "./active-popover";

it("closes the previous editor before opening another", () => {
  const coordinator = createActivePopoverCoordinator();
  const closeFirst = vi.fn();
  coordinator.open("first", closeFirst);
  coordinator.open("second", () => undefined);
  expect(closeFirst).toHaveBeenCalledTimes(1);
  expect(coordinator.getActiveId()).toBe("second");
});

it("does not close a newly opened editor with a stale id", () => {
  const coordinator = createActivePopoverCoordinator();
  coordinator.open("current", () => undefined);
  coordinator.close("old");
  expect(coordinator.getActiveId()).toBe("current");
});
