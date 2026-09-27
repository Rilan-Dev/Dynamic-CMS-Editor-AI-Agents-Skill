export const ANIMATION_PRESETS = [
  "none",
  "fade",
  "fade-up",
  "fade-down",
  "fade-left",
  "fade-right",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "scale-in",
  "scale-out",
  "zoom-in",
  "zoom-out",
  "rotate-in",
  "flip-x",
  "flip-y",
  "blur-in",
  "wipe-left",
  "wipe-right",
  "clip-reveal",
  "bounce-in",
  "spring-in",
  "elastic-in",
  "float",
  "pulse",
  "shake",
  "text-words",
  "text-characters",
  "typewriter",
  "counter",
  "parallax",
  "marquee",
] as const;

export const ANIMATION_TRIGGERS = [
  "page-load",
  "page-enter",
  "page-exit",
  "in-view",
  "scroll-progress",
  "hover",
  "focus",
  "click",
  "section-active",
] as const;

export const ANIMATION_SCOPE_MODES = [
  "inherit",
  "override",
  "combine",
  "disabled",
] as const;

export const ANIMATION_DEVICES = ["desktop", "tablet", "mobile"] as const;

export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];
export type AnimationTrigger = (typeof ANIMATION_TRIGGERS)[number];
export type AnimationScopeMode = (typeof ANIMATION_SCOPE_MODES)[number];
export type AnimationDevice = (typeof ANIMATION_DEVICES)[number];
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

export interface ResolvedAnimationTiming {
  durationMs: number;
  delayMs: number;
  staggerMs: number;
  easing: string;
  repeat: number | "infinite";
  direction: AnimationDirection;
  playbackRate: number;
  spring: Required<AnimationSpring>;
}

export interface ResolvedAnimationViewport {
  threshold: number;
  rootMargin: string;
  once: boolean;
  replayOnReentry: boolean;
  reverseOnExit: boolean;
  scrub: boolean;
  scrubSmoothing: number;
  parallaxStrength: number;
}

export interface ResolvedAnimationDevices {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
  reducedMotion: ReducedMotionBehavior;
}

export interface ResolvedAnimationTransform {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  blurPx: number;
}

export interface ResolvedAnimationConfig {
  enabled: boolean;
  mode: AnimationScopeMode;
  preset: AnimationPreset;
  trigger: AnimationTrigger;
  timing: ResolvedAnimationTiming;
  viewport: ResolvedAnimationViewport;
  devices: ResolvedAnimationDevices;
  transform: ResolvedAnimationTransform;
  applyToChildren: boolean;
  sequence: AnimationStep[];
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

export interface PageTransitionConfig {
  enabled?: boolean;
  preset?: "fade" | "slide-left" | "slide-right" | "scale" | "wipe" | "curtain";
  enterDurationMs?: number;
  exitDurationMs?: number;
  easing?: string;
  showOverlay?: boolean;
  overlayBackground?: string;
  overlayLogo?: { src?: string; alt?: string };
  directionAware?: boolean;
  excludedPaths?: string[];
  reducedMotion?: ReducedMotionBehavior;
}

export const DEFAULT_ANIMATION_CONFIG: ResolvedAnimationConfig = {
  enabled: true,
  mode: "inherit",
  preset: "none",
  trigger: "in-view",
  timing: {
    durationMs: 600,
    delayMs: 0,
    staggerMs: 0,
    easing: "ease-out",
    repeat: 0,
    direction: "normal",
    playbackRate: 1,
    spring: {
      stiffness: 170,
      damping: 26,
      mass: 1,
    },
  },
  viewport: {
    threshold: 0.15,
    rootMargin: "0px 0px -10% 0px",
    once: true,
    replayOnReentry: false,
    reverseOnExit: false,
    scrub: false,
    scrubSmoothing: 0.15,
    parallaxStrength: 0,
  },
  devices: {
    desktop: true,
    tablet: true,
    mobile: true,
    reducedMotion: "disable",
  },
  transform: {
    x: 0,
    y: 24,
    scale: 0.96,
    rotate: 0,
    opacity: 0,
    blurPx: 8,
  },
  applyToChildren: false,
  sequence: [],
};

export const DEFAULT_PAGE_TRANSITION: Required<
  Omit<PageTransitionConfig, "overlayLogo">
> & { overlayLogo: { src: string; alt: string } } = {
  enabled: false,
  preset: "fade",
  enterDurationMs: 300,
  exitDurationMs: 220,
  easing: "ease-in-out",
  showOverlay: false,
  overlayBackground: "#ffffff",
  overlayLogo: { src: "", alt: "" },
  directionAware: false,
  excludedPaths: [],
  reducedMotion: "disable",
};
