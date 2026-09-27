import type { AnimationEditorTarget, AnimationScopeOption } from "./types";

const readableType = (type: string): string => {
  switch (type) {
    case "listItem": return "list item";
    case "page": return "page";
    case "section": return "section";
    default: return type;
  }
};

const plural = (type: string): string => {
  if (type === "listItem") return "list items";
  if (type === "text") return "text blocks";
  return `${readableType(type)}s`;
};

const pageLabel = (pageId: string): string =>
  pageId ? `${pageId.charAt(0).toUpperCase()}${pageId.slice(1)} page` : "This page";

export function buildScopeOptions(
  target: AnimationEditorTarget,
  similarTargetIds: string[],
): AnimationScopeOption[] {
  const type = readableType(target.type);
  const options: AnimationScopeOption[] = [
    {
      scope: { kind: "target", targetId: target.id },
      label: `Only this ${type}`,
      description: target.label,
    },
  ];

  if (similarTargetIds.length > 1) {
    options.push({
      scope: {
        kind: "similar-page",
        targetType: target.type,
        targetIds: similarTargetIds,
      },
      label: `All ${plural(target.type)} on this page`,
      description: `${similarTargetIds.length} matching items`,
      confirmation: `Apply to ${similarTargetIds.length} ${plural(target.type)} on this page`,
    });
  }

  if (target.sectionId) {
    options.push({
      scope: { kind: "section", sectionId: target.sectionId },
      label: "This whole section",
      description: `Everything in ${target.sectionId}`,
      confirmation: `Apply to the entire ${target.sectionId} section`,
    });
  }

  options.push({
    scope: { kind: "page", pageId: target.pageId },
    label: "This page",
    description: pageLabel(target.pageId),
    confirmation: `Apply to the entire ${pageLabel(target.pageId)}`,
  });

  options.push({
    scope: { kind: "global", targetType: target.type },
    label: "Every page",
    description: `Use for every ${type} across the website`,
    confirmation: `Use for every ${type} across the website`,
    requiresSecondConfirmation: true,
  });

  return options;
}
