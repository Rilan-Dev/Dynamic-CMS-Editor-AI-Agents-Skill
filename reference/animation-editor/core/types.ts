import type { ReactNode } from "react";

export type AnimationPreset =
  | "none"
  | "fade"
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "scale-out"
  | "zoom-in"
  | "zoom-out"
  | "rotate-in"
  | "flip-x"
  | "flip-y"
  | "blur-in"
  | "wipe-left"
  | "wipe-right"
  | "clip-reveal"
  | "bounce-in"
  | "spring-in"
  | "elastic-in"
  | "float"
  | "pulse"
  | "shake"
  | "text-words"
  | "text-characters"
  | "typewriter"
  | "counter"
  | "parallax"
  | "marquee";

export type AnimationTrigger =
  | "page-load"
  | "page-enter"
  | "page-exit"
  | "in-view"
  | "scroll-progress"
  | "hover"
  | "focus"
  | "click"
  | "section-active";

export type AnimationScopeMode = "inherit" | "override" | "combine" | "disabled";
export type ReducedMotionBehavior = "disable" | "fade" | "instant";
export type AnimationDirection = "normal" | "reverse" | "alternate";

export interface AnimationSpring {
  stiffness?: number;
  damping?: number;
  mass?: number;
}

export interface AnimationTiming {
  durationMs?: number;
  delayMs?: number;
  staggerMs?: number;
  easing?: string;
  repeat?: number | "infinite";
  direction?: AnimationDirection;
  playbackRate?: number;
  spring?: AnimationSpring;
}

export interface AnimationViewport {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  replayOnReentry?: boolean;
  reverseOnExit?: boolean;
  scrub?: boolean;
  scrubSmoothing?: number;
  parallaxStrength?: number;
}

export interface AnimationDevices {
  desktop?: boolean;
  tablet?: boolean;
  mobile?: boolean;
  reducedMotion?: ReducedMotionBehavior;
}

export interface AnimationTransform {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  blurPx?: number;
}

export interface AnimationStep {
  id: string;
  preset: AnimationPreset;
  trigger?: AnimationTrigger;
  timing?: AnimationTiming;
  viewport?: AnimationViewport;
  transform?: AnimationTransform;
}

export interface AnimationConfig {
  enabled?: boolean;
  mode?: AnimationScopeMode;
  preset?: AnimationPreset;
  trigger?: AnimationTrigger;
  timing?: AnimationTiming;
  viewport?: AnimationViewport;
  devices?: AnimationDevices;
  transform?: AnimationTransform;
  applyToChildren?: boolean;
  sequence?: AnimationStep[];
}

export type AnimationTargetType =
  | "page"
  | "section"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "card"
  | "icon"
  | "listItem";

export type AnimationIntentGroup =
  | "entrance"
  | "attention"
  | "interaction"
  | "scroll"
  | "none";

export type AnimationStrength = "gentle" | "balanced" | "bold";
export type AnimationSpeed = "slow" | "normal" | "fast";
export type AnimationDelayChoice = "none" | "slight" | "noticeable";
export type AnimationRepetition = "once" | "on-reentry" | "continuous";
export type AnimationStaggerChoice = "together" | "sequence" | "relaxed";
export type PageTransitionIntentId =
  | "none"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "scale"
  | "wipe"
  | "curtain";

export interface PageTransitionEditorConfig {
  enabled: boolean;
  preset: PageTransitionIntentId;
  easing: string;
  enterDurationMs: number;
  exitDurationMs: number;
  showOverlay?: boolean;
  overlayBackground?: string;
  reducedMotion?: ReducedMotionBehavior;
}

export interface AnimationEditorTarget {
  id: string;
  type: AnimationTargetType;
  label: string;
  pageId: string;
  sectionId?: string;
  element?: HTMLElement | null;
}

export type AnimationApplyScope =
  | { kind: "target"; targetId: string }
  | { kind: "similar-page"; targetType: AnimationTargetType; targetIds: string[] }
  | { kind: "section"; sectionId: string }
  | { kind: "page"; pageId: string }
  | { kind: "global"; targetType?: AnimationTargetType };

export interface AnimationScopeOption {
  scope: AnimationApplyScope;
  label: string;
  description: string;
  confirmation?: string;
  requiresSecondConfirmation?: boolean;
}

export interface AnimationIntentDefaults {
  strength: AnimationStrength;
  speed: AnimationSpeed;
  delay: AnimationDelayChoice;
  trigger: AnimationTrigger;
  repetition: AnimationRepetition;
  stagger?: AnimationStaggerChoice;
}

export interface AnimationIntentDefinition {
  id: string;
  group: AnimationIntentGroup;
  title: string;
  description: string;
  supportedTargetTypes: AnimationTargetType[];
  allowedTriggers: AnimationTrigger[];
  defaults: AnimationIntentDefaults;
  previewGlyph?: ReactNode;
}

export type AnimationDraftStatus =
  | "idle"
  | "previewing"
  | "unsaved"
  | "saving"
  | "saved"
  | "saved-local-only"
  | "error";

export interface AnimationPathChange {
  document: "page" | "site";
  path: Array<string | number>;
  previousValue: unknown;
  nextValue: unknown;
}

export interface AnimationDraftReceipt {
  id: string;
  label: string;
  changes: AnimationPathChange[];
}

export interface SaveAnimationDraftInput {
  target: AnimationEditorTarget;
  scope: AnimationApplyScope;
  config: AnimationConfig;
  label: string;
}

export interface ResetAnimationDraftInput {
  target: AnimationEditorTarget;
  scope: AnimationApplyScope;
}

export interface AnimationEditorAdapter {
  getDraftConfig(target: AnimationEditorTarget, scope: AnimationApplyScope): AnimationConfig;
  getPublishedConfig(target: AnimationEditorTarget, scope: AnimationApplyScope): AnimationConfig;
  getAvailableScopes(target: AnimationEditorTarget): AnimationScopeOption[];
  preview(target: AnimationEditorTarget, config: AnimationConfig): void;
  clearPreview(target: AnimationEditorTarget): void;
  replay(target: AnimationEditorTarget): void;
  cancel(target: AnimationEditorTarget): void;
  saveDraft(input: SaveAnimationDraftInput): Promise<AnimationDraftReceipt>;
  undo(receipt: AnimationDraftReceipt): Promise<void>;
  resetDraft(input: ResetAnimationDraftInput): Promise<void>;
  subscribeStatus(listener: (status: AnimationDraftStatus) => void): () => void;
  getPageTransitionConfig?(): PageTransitionEditorConfig;
  previewPageTransition?(config: PageTransitionEditorConfig): void;
  clearPageTransitionPreview?(): void;
  savePageTransition?(
    config: PageTransitionEditorConfig,
    label: string,
  ): Promise<AnimationDraftReceipt>;
}

export interface AnimationEditorSlots {
  renderIcon?: (name: "sparkles" | "close" | "undo" | "play") => ReactNode;
  renderToast?: (message: string, tone: "success" | "error" | "info") => void;
  portalRoot?: HTMLElement | null;
}
