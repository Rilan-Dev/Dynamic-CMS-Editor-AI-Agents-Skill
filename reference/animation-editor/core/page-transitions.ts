import type {
  AnimationSpeed,
  PageTransitionEditorConfig,
  PageTransitionIntentId,
} from "./types";

export interface PageTransitionIntentDefinition {
  id: PageTransitionIntentId;
  title: string;
  description: string;
  glyph: string;
}

export const PAGE_TRANSITION_INTENTS: PageTransitionIntentDefinition[] = [
  { id: "none", title: "No page transition", description: "Change pages immediately.", glyph: "—" },
  { id: "fade", title: "Soft fade", description: "Fade smoothly between pages.", glyph: "◌" },
  { id: "slide-left", title: "Slide forward", description: "Move the next page in from the side.", glyph: "→" },
  { id: "slide-right", title: "Slide backward", description: "Move the next page in from the other side.", glyph: "←" },
  { id: "scale", title: "Gentle zoom", description: "Zoom softly between pages.", glyph: "⊕" },
  { id: "wipe", title: "Clean reveal", description: "Reveal the next page from one side.", glyph: "▰" },
  { id: "curtain", title: "Curtain reveal", description: "Open the next page from the center.", glyph: "↔" },
];

const ENTER_DURATION: Record<AnimationSpeed, number> = {
  slow: 520,
  normal: 320,
  fast: 180,
};

const EXIT_DURATION: Record<AnimationSpeed, number> = {
  slow: 380,
  normal: 220,
  fast: 120,
};

export function pageTransitionConfig(
  intentId: PageTransitionIntentId,
  speed: AnimationSpeed,
  previous?: Partial<PageTransitionEditorConfig>,
): PageTransitionEditorConfig {
  return {
    enabled: intentId !== "none",
    preset: intentId,
    easing: previous?.easing ?? "ease-in-out",
    enterDurationMs: ENTER_DURATION[speed],
    exitDurationMs: EXIT_DURATION[speed],
    showOverlay: previous?.showOverlay ?? false,
    overlayBackground: previous?.overlayBackground ?? "#ffffff",
    reducedMotion: previous?.reducedMotion ?? "disable",
  };
}

export function pageTransitionSpeed(
  config: Partial<PageTransitionEditorConfig>,
): AnimationSpeed {
  const duration = Number(config.enterDurationMs ?? 320);
  return duration <= 220 ? "fast" : duration >= 440 ? "slow" : "normal";
}

export function normalizePageTransitionConfig(
  value: unknown,
): PageTransitionEditorConfig {
  const config = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Partial<PageTransitionEditorConfig>)
    : {};
  const preset = PAGE_TRANSITION_INTENTS.some((intent) => intent.id === config.preset)
    ? (config.preset as PageTransitionIntentId)
    : "fade";
  return {
    enabled: config.enabled === true,
    preset,
    easing: typeof config.easing === "string" ? config.easing : "ease-in-out",
    enterDurationMs: Math.max(0, Number(config.enterDurationMs ?? 300)),
    exitDurationMs: Math.max(0, Number(config.exitDurationMs ?? 220)),
    showOverlay: config.showOverlay === true,
    overlayBackground:
      typeof config.overlayBackground === "string"
        ? config.overlayBackground
        : "#ffffff",
    reducedMotion:
      config.reducedMotion === "fade" || config.reducedMotion === "instant"
        ? config.reducedMotion
        : "disable",
  };
}
