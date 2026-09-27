"use client";

import type { AnimationConfig } from "@/components/animations/types";
import { normalizePageTransitionConfig } from "@/components/animation-editor/core/page-transitions";
import { buildScopeOptions } from "@/components/animation-editor/core/scope";
import { createUndoReceipt } from "@/components/animation-editor/core/undo";
import type {
  AnimationApplyScope,
  AnimationDraftReceipt,
  AnimationDraftStatus,
  AnimationEditorAdapter,
  AnimationEditorTarget,
  AnimationPathChange,
  PageTransitionEditorConfig,
  ResetAnimationDraftInput,
  SaveAnimationDraftInput,
} from "@/components/animation-editor/core/types";
import { getTargetsByType } from "@/components/animations/targetRegistry";
import {
  cancelAnimationTarget,
  replayAnimationTarget,
} from "@/components/animations/useAnimationRuntime";
import { getAtPath, type JsonValue } from "../json";
import {
  getEditingDoc,
  getPublishedDoc,
  setPath,
  type DocScope,
} from "../store";
import { pathForScope } from "./scopePaths";

const PAGE_TRANSITION_PATH = ["animations", "pageTransition"] as const;

const asConfig = (value: unknown): AnimationConfig =>
  value && typeof value === "object" && !Array.isArray(value)
    ? structuredClone(value as AnimationConfig)
    : {};

const cloneValue = (value: unknown): unknown =>
  value === undefined ? undefined : structuredClone(value);

const replayAfterRender = (targetId: string) => {
  window.requestAnimationFrame(() => replayAnimationTarget(targetId));
};

const transitionFrames = (
  preset: PageTransitionEditorConfig["preset"],
  phase: "enter" | "exit",
): Keyframe[] => {
  const entering = phase === "enter";
  switch (preset) {
    case "slide-left":
      return entering
        ? [{ opacity: 0, transform: "translateX(3rem)" }, { opacity: 1, transform: "none" }]
        : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-3rem)" }];
    case "slide-right":
      return entering
        ? [{ opacity: 0, transform: "translateX(-3rem)" }, { opacity: 1, transform: "none" }]
        : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(3rem)" }];
    case "scale":
      return entering
        ? [{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "scale(1)" }]
        : [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.025)" }];
    case "wipe":
      return entering
        ? [{ clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }]
        : [{ clipPath: "inset(0 0 0 0)", opacity: 1 }, { clipPath: "inset(0 0 0 100%)", opacity: 1 }];
    case "curtain":
      return entering
        ? [{ clipPath: "inset(50% 0 50% 0)", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }]
        : [{ clipPath: "inset(0 0 0 0)", opacity: 1 }, { clipPath: "inset(50% 0 50% 0)", opacity: 1 }];
    case "none":
      return [{ opacity: 1 }, { opacity: 1 }];
    case "fade":
    default:
      return entering
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 1 }, { opacity: 0 }];
  }
};

export function createSmtsAnimationEditorAdapter(): AnimationEditorAdapter {
  let status: AnimationDraftStatus = "idle";
  const listeners = new Set<(status: AnimationDraftStatus) => void>();
  const activePageTransitionAnimations = new Set<Animation>();
  let pageTransitionPreviewGeneration = 0;

  const emit = (next: AnimationDraftStatus) => {
    status = next;
    listeners.forEach((listener) => listener(status));
  };

  const cancelPageTransitionPreview = () => {
    pageTransitionPreviewGeneration += 1;
    activePageTransitionAnimations.forEach((animation) => animation.cancel());
    activePageTransitionAnimations.clear();
  };

  const previewPageTransition = (config: PageTransitionEditorConfig) => {
    cancelPageTransitionPreview();
    if (!config.enabled || config.preset === "none") return;
    const root = document.querySelector<HTMLElement>("[data-page-transition-root]");
    if (!root || typeof root.animate !== "function") return;

    const generation = pageTransitionPreviewGeneration;
    const exit = root.animate(transitionFrames(config.preset, "exit"), {
      duration: Math.max(0, config.exitDurationMs),
      easing: config.easing,
      fill: "both",
    });
    activePageTransitionAnimations.add(exit);
    void exit.finished
      .then(() => {
        activePageTransitionAnimations.delete(exit);
        if (generation !== pageTransitionPreviewGeneration) return;
        const enter = root.animate(transitionFrames(config.preset, "enter"), {
          duration: Math.max(0, config.enterDurationMs),
          easing: config.easing,
          fill: "both",
        });
        activePageTransitionAnimations.add(enter);
        void enter.finished
          .catch(() => undefined)
          .finally(() => {
            activePageTransitionAnimations.delete(enter);
            enter.cancel();
          });
      })
      .catch(() => undefined)
      .finally(() => {
        activePageTransitionAnimations.delete(exit);
        exit.cancel();
      });
  };

  const readConfig = (
    target: AnimationEditorTarget,
    scope: AnimationApplyScope,
    published: boolean,
  ): AnimationConfig => {
    const entry = pathForScope(target, scope)[0];
    if (!entry) return {};
    const document = published
      ? getPublishedDoc(entry.document)
      : getEditingDoc(entry.document);
    return asConfig(document ? getAtPath(document, entry.path) : undefined);
  };

  const readPageTransition = (): PageTransitionEditorConfig => {
    const siteDoc = getEditingDoc("site");
    return normalizePageTransitionConfig(
      siteDoc ? getAtPath(siteDoc, [...PAGE_TRANSITION_PATH]) : undefined,
    );
  };

  return {
    getDraftConfig: (target, scope) => readConfig(target, scope, false),
    getPublishedConfig: (target, scope) => readConfig(target, scope, true),
    getAvailableScopes(target) {
      const similarTargetIds = getTargetsByType(target.type)
        .filter((candidate) => candidate.pageId === target.pageId)
        .map((candidate) => candidate.id);
      return buildScopeOptions(target, similarTargetIds);
    },
    preview(target) {
      replayAfterRender(target.id);
    },
    clearPreview(target) {
      cancelAnimationTarget(target.id);
      replayAfterRender(target.id);
    },
    replay(target) {
      replayAfterRender(target.id);
    },
    cancel(target) {
      cancelAnimationTarget(target.id);
    },
    async saveDraft(input: SaveAnimationDraftInput): Promise<AnimationDraftReceipt> {
      emit("unsaved");
      const locations = pathForScope(input.target, input.scope);
      const changes: AnimationPathChange[] = locations.map((location) => {
        const document = getEditingDoc(location.document);
        const previousValue = document
          ? getAtPath(document, location.path)
          : undefined;
        return {
          document: location.document,
          path: [...location.path],
          previousValue: cloneValue(previousValue),
          nextValue: cloneValue(input.config),
        };
      });

      emit("saving");
      locations.forEach((location) => {
        setPath(
          location.path,
          structuredClone(input.config) as unknown as JsonValue,
          location.document as DocScope,
        );
      });
      const receipt = createUndoReceipt(input.label, changes);
      emit("saved");
      return receipt;
    },
    async undo(receipt) {
      emit("saving");
      receipt.changes.forEach((change) => {
        setPath(
          change.path,
          (change.previousValue === undefined
            ? null
            : structuredClone(change.previousValue)) as JsonValue,
          change.document,
        );
      });
      receipt.changes.forEach((change) => {
        const targetId =
          change.path[1] === "components" && typeof change.path[2] === "string"
            ? change.path[2]
            : change.path[1] === "sections" && typeof change.path[2] === "string"
              ? `section:${change.path[2]}`
              : undefined;
        if (targetId) replayAfterRender(targetId);
      });
      emit("saved");
    },
    async resetDraft(input: ResetAnimationDraftInput) {
      emit("saving");
      pathForScope(input.target, input.scope).forEach((location) => {
        setPath(location.path, null, location.document);
      });
      emit("saved");
    },
    subscribeStatus(listener) {
      listeners.add(listener);
      listener(status);
      return () => listeners.delete(listener);
    },
    getPageTransitionConfig: readPageTransition,
    previewPageTransition,
    clearPageTransitionPreview: cancelPageTransitionPreview,
    async savePageTransition(config, label) {
      emit("unsaved");
      const siteDoc = getEditingDoc("site");
      const previousValue = siteDoc
        ? getAtPath(siteDoc, [...PAGE_TRANSITION_PATH])
        : undefined;
      const nextConfig = structuredClone(config);
      const receipt = createUndoReceipt(label, [
        {
          document: "site",
          path: [...PAGE_TRANSITION_PATH],
          previousValue: cloneValue(previousValue),
          nextValue: cloneValue(nextConfig),
        },
      ]);
      emit("saving");
      setPath(
        [...PAGE_TRANSITION_PATH],
        nextConfig as unknown as JsonValue,
        "site",
      );
      emit("saved");
      return receipt;
    },
  };
}
