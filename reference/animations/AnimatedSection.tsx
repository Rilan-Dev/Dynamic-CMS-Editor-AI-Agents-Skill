"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { EditableAnimationTarget } from "./EditableAnimationTarget";
import {
  SectionAnimationProvider,
  useCurrentAnimationPage,
  useResolvedAnimationConfig,
} from "./AnimationProvider";
import { registerAnimationTarget } from "./targetRegistry";
import { useAnimationRuntime } from "./useAnimationRuntime";

export function AnimatedSection({
  id,
  label,
  as: Tag = "section",
  className,
  children,
}: {
  id: string;
  label: string;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const targetId = `section:${id}`;
  const pageId = useCurrentAnimationPage();
  const ref = useRef<HTMLElement | null>(null);
  const config = useResolvedAnimationConfig({
    type: "section",
    targetId,
    sectionId: id,
  });

  useAnimationRuntime(ref, config, 0, targetId);

  useEffect(
    () =>
      registerAnimationTarget({
        id: targetId,
        type: "section",
        label,
        pageId,
        sectionId: id,
        element: ref.current,
      }),
    [id, label, pageId, targetId],
  );

  return (
    <Tag
      ref={ref as any}
      className={className}
      data-animation-target={targetId}
      data-animation-type="section"
    >
      <SectionAnimationProvider sectionId={id}>{children}</SectionAnimationProvider>
      <EditableAnimationTarget
        target={{
          id: targetId,
          type: "section",
          label,
          pageId,
          sectionId: id,
          element: ref.current,
        }}
      />
    </Tag>
  );
}
