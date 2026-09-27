import type { PageTransitionEditorConfig } from "../core/types";

export type PageTransitionPhase = "enter" | "exit";

export function pageTransitionKeyframes(
  preset: PageTransitionEditorConfig["preset"],
  phase: PageTransitionPhase,
): Keyframe[] {
  const entering = phase === "enter";
  switch (preset) {
    case "slide-left":
      return entering
        ? [
            { opacity: 0, transform: "translateX(3rem)" },
            { opacity: 1, transform: "none" },
          ]
        : [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "translateX(-3rem)" },
          ];
    case "slide-right":
      return entering
        ? [
            { opacity: 0, transform: "translateX(-3rem)" },
            { opacity: 1, transform: "none" },
          ]
        : [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "translateX(3rem)" },
          ];
    case "scale":
      return entering
        ? [
            { opacity: 0, transform: "scale(0.97)" },
            { opacity: 1, transform: "scale(1)" },
          ]
        : [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(1.025)" },
          ];
    case "wipe":
      return entering
        ? [
            { clipPath: "inset(0 100% 0 0)", opacity: 1 },
            { clipPath: "inset(0 0 0 0)", opacity: 1 },
          ]
        : [
            { clipPath: "inset(0 0 0 0)", opacity: 1 },
            { clipPath: "inset(0 0 0 100%)", opacity: 1 },
          ];
    case "curtain":
      return entering
        ? [
            { clipPath: "inset(50% 0 50% 0)", opacity: 1 },
            { clipPath: "inset(0 0 0 0)", opacity: 1 },
          ]
        : [
            { clipPath: "inset(0 0 0 0)", opacity: 1 },
            { clipPath: "inset(50% 0 50% 0)", opacity: 1 },
          ];
    case "none":
      return [{ opacity: 1 }, { opacity: 1 }];
    case "fade":
    default:
      return entering
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 1 }, { opacity: 0 }];
  }
}

export function reducedMotionPageTransition(
  config: PageTransitionEditorConfig,
  prefersReducedMotion: boolean,
): PageTransitionEditorConfig {
  if (!prefersReducedMotion) return config;
  if (config.reducedMotion === "instant" || config.reducedMotion === "disable") {
    return { ...config, enabled: false, preset: "none" };
  }
  return {
    ...config,
    preset: "fade",
    enterDurationMs: Math.min(config.enterDurationMs, 140),
    exitDurationMs: Math.min(config.exitDurationMs, 100),
  };
}

export interface PageTransitionPreviewController {
  preview(config: PageTransitionEditorConfig): void;
  clear(): void;
}

export function createPageTransitionPreviewController(
  resolveRoot: () => HTMLElement | null,
): PageTransitionPreviewController {
  const active = new Set<Animation>();
  let generation = 0;

  const clear = () => {
    generation += 1;
    active.forEach((animation) => animation.cancel());
    active.clear();
  };

  const preview = (input: PageTransitionEditorConfig) => {
    clear();
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const config = reducedMotionPageTransition(input, prefersReducedMotion);
    if (!config.enabled || config.preset === "none") return;

    const root = resolveRoot();
    if (!root || typeof root.animate !== "function") return;
    const currentGeneration = generation;
    const exit = root.animate(pageTransitionKeyframes(config.preset, "exit"), {
      duration: Math.max(0, config.exitDurationMs),
      easing: config.easing,
      fill: "both",
    });
    active.add(exit);

    void exit.finished
      .then(() => {
        active.delete(exit);
        if (currentGeneration !== generation) return;
        const enter = root.animate(pageTransitionKeyframes(config.preset, "enter"), {
          duration: Math.max(0, config.enterDurationMs),
          easing: config.easing,
          fill: "both",
        });
        active.add(enter);
        void enter.finished
          .catch(() => undefined)
          .finally(() => {
            active.delete(enter);
            enter.cancel();
          });
      })
      .catch(() => undefined)
      .finally(() => {
        active.delete(exit);
        exit.cancel();
      });
  };

  return { preview, clear };
}
