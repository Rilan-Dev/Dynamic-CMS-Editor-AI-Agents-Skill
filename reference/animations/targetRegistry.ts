"use client";

import { useSyncExternalStore } from "react";
import type { AnimationTargetType } from "./types";

export interface AnimationTarget {
  id: string;
  type: AnimationTargetType;
  label: string;
  pageId: string;
  sectionId?: string;
  element?: HTMLElement | null;
}

const EMPTY_TARGETS: AnimationTarget[] = [];
let targets = new Map<string, AnimationTarget>();
let snapshot: AnimationTarget[] = EMPTY_TARGETS;
const listeners = new Set<() => void>();

const emit = () => {
  snapshot = Array.from(targets.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
  listeners.forEach((listener) => listener());
};

export function registerAnimationTarget(target: AnimationTarget): () => void {
  targets.set(target.id, target);
  emit();
  return () => {
    if (targets.get(target.id) === target) {
      targets.delete(target.id);
      emit();
    }
  };
}

export function getAnimationTargets(): AnimationTarget[] {
  return snapshot;
}

export function getTargetById(id: string): AnimationTarget | undefined {
  return targets.get(id);
}

export function getTargetsByType(type: AnimationTargetType): AnimationTarget[] {
  return snapshot.filter((target) => target.type === type);
}

export function getTargetsBySection(sectionId: string): AnimationTarget[] {
  return snapshot.filter((target) => target.sectionId === sectionId);
}

export function clearAnimationTargets(): void {
  targets = new Map();
  snapshot = EMPTY_TARGETS;
  listeners.forEach((listener) => listener());
}

export function useAnimationTargets(): AnimationTarget[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getAnimationTargets,
    () => EMPTY_TARGETS,
  );
}
