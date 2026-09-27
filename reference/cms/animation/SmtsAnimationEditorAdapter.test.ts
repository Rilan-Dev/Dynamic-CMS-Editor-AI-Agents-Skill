import { describe, expect, it } from "vitest";
import type {
  AnimationApplyScope,
  AnimationEditorTarget,
} from "@/components/animation-editor/core/types";
import { pathForScope } from "./scopePaths";

const target: AnimationEditorTarget = {
  id: "component:hero:quote",
  type: "button",
  label: "Quote button",
  pageId: "home",
  sectionId: "hero",
};

const cases: Array<{
  scope: AnimationApplyScope;
  document: "page" | "site";
  path: Array<string | number>;
}> = [
  {
    scope: { kind: "target", targetId: target.id },
    document: "page",
    path: ["animations", "components", target.id],
  },
  {
    scope: { kind: "section", sectionId: "hero" },
    document: "page",
    path: ["animations", "sections", "hero"],
  },
  {
    scope: { kind: "page", pageId: "home" },
    document: "page",
    path: ["animations", "page"],
  },
  {
    scope: { kind: "global", targetType: "button" },
    document: "site",
    path: ["animations", "defaultsByType", "button"],
  },
];

describe("SMTS animation scope path mapping", () => {
  it.each(cases)("maps $scope.kind scope to the intended document", ({ scope, document, path }) => {
    expect(pathForScope(target, scope)[0]).toMatchObject({ document, path });
  });

  it("creates one page path per similar component", () => {
    const paths = pathForScope(target, {
      kind: "similar-page",
      targetType: "button",
      targetIds: ["a", "b"],
    });
    expect(paths.map((entry) => entry.path)).toEqual([
      ["animations", "components", "a"],
      ["animations", "components", "b"],
    ]);
  });
});
