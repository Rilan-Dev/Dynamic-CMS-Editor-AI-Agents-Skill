"use client";

import { useEffect, type RefObject } from "react";
import { animationDefinition } from "./presets";
import type { AnimationStep, ResolvedAnimationConfig } from "./types";

export const animationReplayEvent = (targetId: string) =>
  `cms-animation-replay:${targetId}`;
export const animationCancelEvent = (targetId: string) =>
  `cms-animation-cancel:${targetId}`;

export function replayAnimationTarget(targetId: string): void {
  window.dispatchEvent(new Event(animationReplayEvent(targetId)));
}

export function cancelAnimationTarget(targetId: string): void {
  window.dispatchEvent(new Event(animationCancelEvent(targetId)));
}

const configForStep = (
  base: ResolvedAnimationConfig,
  step: AnimationStep,
): ResolvedAnimationConfig => ({
  ...base,
  preset: step.preset,
  trigger: step.trigger ?? base.trigger,
  timing: {
    ...base.timing,
    ...step.timing,
    spring: { ...base.timing.spring, ...step.timing?.spring },
  },
  viewport: { ...base.viewport, ...step.viewport },
  transform: { ...base.transform, ...step.transform },
  sequence: [],
});

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function useAnimationRuntime(
  ref: RefObject<HTMLElement | null>,
  config: ResolvedAnimationConfig,
  staggerIndex = 0,
  targetId?: string,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let disposed = false;
    let observer: IntersectionObserver | null = null;
    let frameRequest: number | null = null;
    const activeAnimations = new Set<Animation>();
    const cleanupCallbacks: Array<() => void> = [];

    const cancelActive = () => {
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations.clear();
    };

    const markVisible = () => {
      cancelActive();
      element.dataset.animationState = "complete";
    };

    const animateConfig = async (nextConfig: ResolvedAnimationConfig) => {
      if (disposed || !nextConfig.enabled) return;
      const definition = animationDefinition(nextConfig.preset, {
        ...nextConfig,
        timing: {
          ...nextConfig.timing,
          delayMs:
            nextConfig.timing.delayMs +
            Math.max(0, staggerIndex) * nextConfig.timing.staggerMs,
        },
      });
      if (!definition) return;
      const animation = element.animate(definition.keyframes, definition.options);
      activeAnimations.add(animation);
      element.dataset.animationState = "running";
      try {
        await animation.finished;
      } catch {
        // Cancellation is expected during previews, navigation and config changes.
      } finally {
        activeAnimations.delete(animation);
        if (nextConfig.timing.repeat !== "infinite") animation.cancel();
      }
    };

    const play = async () => {
      if (disposed) return;
      cancelActive();
      if (!config.enabled || (config.preset === "none" && config.sequence.length === 0)) {
        markVisible();
        return;
      }
      if (config.preset !== "none") await animateConfig(config);
      for (const step of config.sequence) {
        if (disposed) break;
        await animateConfig(configForStep(config, step));
      }
      if (!disposed) element.dataset.animationState = "complete";
    };

    const playReverse = () => {
      if (!config.enabled) return;
      const definition = animationDefinition(config.preset, config);
      if (!definition) return;
      const animation = element.animate([...definition.keyframes].reverse(), {
        ...definition.options,
        delay: 0,
        iterations: 1,
      });
      activeAnimations.add(animation);
      animation.finished
        .finally(() => activeAnimations.delete(animation))
        .catch(() => undefined);
    };

    if (targetId) {
      const replayName = animationReplayEvent(targetId);
      const cancelName = animationCancelEvent(targetId);
      const replayHandler = () => void play();
      const cancelHandler = () => markVisible();
      window.addEventListener(replayName, replayHandler);
      window.addEventListener(cancelName, cancelHandler);
      cleanupCallbacks.push(() => {
        window.removeEventListener(replayName, replayHandler);
        window.removeEventListener(cancelName, cancelHandler);
      });
    }

    if (!config.enabled || (config.preset === "none" && config.sequence.length === 0)) {
      markVisible();
      return () => {
        disposed = true;
        cleanupCallbacks.forEach((cleanup) => cleanup());
        delete element.dataset.animationState;
      };
    }

    const listeners: Array<[keyof HTMLElementEventMap, EventListener]> = [];
    const listen = (name: keyof HTMLElementEventMap, handler: EventListener) => {
      element.addEventListener(name, handler);
      listeners.push([name, handler]);
    };

    const startScrollLinkedAnimation = () => {
      const scrollConfig =
        config.preset !== "none"
          ? config
          : config.sequence[0]
            ? configForStep(config, config.sequence[0])
            : null;
      if (!scrollConfig) return;

      const definition = animationDefinition(scrollConfig.preset, {
        ...scrollConfig,
        timing: { ...scrollConfig.timing, delayMs: 0, repeat: 0 },
      });
      if (!definition) return;

      const animation = element.animate(definition.keyframes, {
        ...definition.options,
        delay: 0,
        iterations: 1,
        fill: "both",
      });
      animation.pause();
      activeAnimations.add(animation);
      element.dataset.animationState = "scroll-linked";

      const duration =
        typeof definition.options.duration === "number"
          ? Math.max(1, definition.options.duration)
          : Math.max(1, scrollConfig.timing.durationMs);
      const smoothing = clamp(scrollConfig.viewport.scrubSmoothing, 0, 1);
      let smoothedProgress = 0;

      const update = () => {
        frameRequest = null;
        if (disposed) return;
        const rect = element.getBoundingClientRect();
        const travelDistance = window.innerHeight + Math.max(1, rect.height);
        const rawProgress = clamp(
          (window.innerHeight - rect.top) / travelDistance,
          0,
          1,
        );
        smoothedProgress =
          smoothing <= 0
            ? rawProgress
            : smoothedProgress + (rawProgress - smoothedProgress) * smoothing;
        animation.currentTime = smoothedProgress * duration;
      };

      const scheduleUpdate = () => {
        if (frameRequest === null) frameRequest = window.requestAnimationFrame(update);
      };
      window.addEventListener("scroll", scheduleUpdate, { passive: true });
      window.addEventListener("resize", scheduleUpdate, { passive: true });
      cleanupCallbacks.push(() => {
        window.removeEventListener("scroll", scheduleUpdate);
        window.removeEventListener("resize", scheduleUpdate);
      });
      scheduleUpdate();
    };

    if (config.trigger === "scroll-progress" || config.viewport.scrub) {
      startScrollLinkedAnimation();
    } else {
      switch (config.trigger) {
        case "hover":
          listen("mouseenter", () => void play());
          break;
        case "focus":
          listen("focusin", () => void play());
          break;
        case "click":
          listen("click", () => void play());
          break;
        case "page-exit":
          break;
        case "in-view":
        case "section-active":
          observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  void play();
                  if (config.viewport.once && !config.viewport.replayOnReentry) {
                    observer?.unobserve(entry.target);
                  }
                } else if (config.viewport.reverseOnExit) {
                  playReverse();
                }
              });
            },
            {
              threshold: config.viewport.threshold,
              rootMargin: config.viewport.rootMargin,
            },
          );
          observer.observe(element);
          break;
        case "page-load":
        case "page-enter":
        default:
          void play();
          break;
      }
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      listeners.forEach(([name, handler]) => element.removeEventListener(name, handler));
      cleanupCallbacks.forEach((cleanup) => cleanup());
      if (frameRequest !== null) window.cancelAnimationFrame(frameRequest);
      cancelActive();
      delete element.dataset.animationState;
    };
  }, [config, ref, staggerIndex, targetId]);
}
