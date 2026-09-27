import type {
  AnimationApplyScope,
  AnimationEditorTarget,
} from "@/components/animation-editor/core/types";
import type { PathSegment } from "../json";

export interface AnimationScopePath {
  document: "page" | "site";
  path: PathSegment[];
  targetId?: string;
}

export function pathForScope(
  target: AnimationEditorTarget,
  scope: AnimationApplyScope,
): AnimationScopePath[] {
  switch (scope.kind) {
    case "target":
      return [{
        document: "page",
        path: ["animations", "components", scope.targetId],
        targetId: scope.targetId,
      }];
    case "similar-page":
      return scope.targetIds.map((id) => ({
        document: "page" as const,
        path: ["animations", "components", id],
        targetId: id,
      }));
    case "section":
      return [{
        document: "page",
        path: ["animations", "sections", scope.sectionId],
        targetId: `section:${scope.sectionId}`,
      }];
    case "page":
      return [{
        document: "page",
        path: ["animations", "page"],
        targetId: `page:${scope.pageId}`,
      }];
    case "global":
      return [{
        document: "site",
        path: scope.targetType
          ? ["animations", "defaultsByType", scope.targetType]
          : ["animations", "global"],
      }];
  }
}
