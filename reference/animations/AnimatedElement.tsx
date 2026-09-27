"use client";

import {
  useEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from "react";
import { EditableAnimationTarget } from "./EditableAnimationTarget";
import {
  useCurrentAnimationPage,
  useCurrentAnimationSection,
  useResolvedAnimationConfig,
} from "./AnimationProvider";
import { registerAnimationTarget } from "./targetRegistry";
import type { AnimationTargetType } from "./types";
import { useAnimationRuntime } from "./useAnimationRuntime";

export function AnimatedElement({
  id,
  type,
  label,
  sectionId,
  staggerIndex = 0,
  as: Tag = "div",
  domId,
  tabIndex,
  className,
  children,
}: {
  id: string;
  type: Exclude<AnimationTargetType, "page" | "section">;
  label: string;
  sectionId?: string;
  staggerIndex?: number;
  as?: ElementType;
  domId?: string;
  tabIndex?: number;
  className?: string;
  children: ReactNode;
}) {
  const pageId = useCurrentAnimationPage();
  const inheritedSection = useCurrentAnimationSection();
  const resolvedSection = sectionId ?? inheritedSection ?? "page";
  const targetId = id.startsWith("component:")
    ? id
    : `component:${resolvedSection}:${id}`;
  const ref = useRef<HTMLElement | null>(null);
  const config = useResolvedAnimationConfig({
    type,
    targetId,
    sectionId: resolvedSection === "page" ? undefined : resolvedSection,
  });

  useAnimationRuntime(ref, config, staggerIndex, targetId);

  useEffect(
    () =>
      registerAnimationTarget({
        id: targetId,
        type,
        label,
        pageId,
        sectionId: resolvedSection === "page" ? undefined : resolvedSection,
        element: ref.current,
      }),
    [label, pageId, resolvedSection, targetId, type],
  );

  return (
    <Tag
      ref={ref as any}
      id={domId}
      tabIndex={tabIndex}
      className={className}
      data-animation-target={targetId}
      data-animation-type={type}
    >
      {children}
      <EditableAnimationTarget
        target={{
          id: targetId,
          type,
          label,
          pageId,
          sectionId: resolvedSection === "page" ? undefined : resolvedSection,
          element: ref.current,
        }}
      />
    </Tag>
  );
}
