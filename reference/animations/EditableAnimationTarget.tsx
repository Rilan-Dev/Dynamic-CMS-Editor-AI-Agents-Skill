"use client";

import dynamic from "next/dynamic";
import type { AnimationEditorTarget } from "@/components/animation-editor/core/types";
import { useCmsEditing } from "@/components/cms/store";

const LazyAnimationTargetOverlay = dynamic(
  () =>
    import("@/components/animation-editor/runtime/AnimationTargetOverlay").then(
      (module) => module.AnimationTargetOverlay,
    ),
  { ssr: false },
);

export function EditableAnimationTarget({
  target,
}: {
  target: AnimationEditorTarget;
}) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return null;
  return <LazyAnimationTargetOverlay target={target} />;
}
