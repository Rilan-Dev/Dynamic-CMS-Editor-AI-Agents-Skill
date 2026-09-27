"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import type { JsonObject } from "@/components/cms/json";
import { EditableAnimationTarget } from "./EditableAnimationTarget";
import {
  PageAnimationProvider,
  useResolvedAnimationConfig,
} from "./AnimationProvider";
import { registerAnimationTarget } from "./targetRegistry";
import { useAnimationRuntime } from "./useAnimationRuntime";

function AnimatedPageBody({
  id,
  label,
  as: Tag,
  className,
  children,
}: {
  id: string;
  label: string;
  as: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const targetId = `page:${id}`;
  const config = useResolvedAnimationConfig({ type: "page", targetId });
  useAnimationRuntime(ref, config, 0, targetId);

  useEffect(
    () =>
      registerAnimationTarget({
        id: targetId,
        type: "page",
        label,
        pageId: id,
        element: ref.current,
      }),
    [id, label, targetId],
  );

  return (
    <Tag
      ref={ref as any}
      className={className}
      data-animation-target={targetId}
      data-animation-type="page"
    >
      {children}
      <EditableAnimationTarget
        target={{
          id: targetId,
          type: "page",
          label,
          pageId: id,
          element: ref.current,
        }}
      />
    </Tag>
  );
}

export function AnimatedPage({
  id,
  label,
  animations,
  as = "div",
  className,
  children,
}: {
  id: string;
  label: string;
  animations: JsonObject;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <PageAnimationProvider pageId={id} pageAnimations={animations}>
      <AnimatedPageBody id={id} label={label} as={as} className={className}>
        {children}
      </AnimatedPageBody>
    </PageAnimationProvider>
  );
}
