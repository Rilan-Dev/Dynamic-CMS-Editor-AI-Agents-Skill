import { expect, it } from "vitest";
import { buildScopeOptions } from "./scope";

it("labels scopes using the selected target and protects global changes", () => {
  const options = buildScopeOptions(
    {
      id: "component:services:card-1",
      type: "card",
      label: "Service card",
      pageId: "services",
      sectionId: "services-grid",
    },
    ["component:services:card-1", "component:services:card-2"],
  );
  expect(options.map((option) => option.label)).toContain("All cards on this page");
  expect(
    options.find((option) => option.scope.kind === "global")?.requiresSecondConfirmation,
  ).toBe(true);
});
