import type {
  AnimationPreset,
  ResolvedAnimationConfig,
} from "./types";

export interface AnimationDefinition {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

const transformFrame = (
  transform: string,
  opacity = 0,
  filter?: string,
): Keyframe => ({ transform, opacity, ...(filter ? { filter } : {}) });

export function animationDefinition(
  preset: AnimationPreset,
  config: ResolvedAnimationConfig,
): AnimationDefinition | null {
  if (!config.enabled || preset === "none") return null;

  const { durationMs, delayMs, easing, repeat, direction, playbackRate } = config.timing;
  const distanceX = Math.abs(config.transform.x) || 36;
  const distanceY = Math.abs(config.transform.y) || 28;
  const parallaxDistance =
    config.viewport.parallaxStrength === 0
      ? distanceY
      : config.viewport.parallaxStrength;
  const baseOptions: KeyframeAnimationOptions = {
    duration: Math.max(0, durationMs / Math.max(playbackRate, 0.1)),
    delay: Math.max(0, delayMs),
    easing,
    iterations: repeat === "infinite" ? Infinity : Math.max(1, repeat + 1),
    direction,
    fill: "both",
  };

  const definitions: Partial<Record<AnimationPreset, Keyframe[]>> = {
    fade: [{ opacity: 0 }, { opacity: 1 }],
    "fade-up": [
      transformFrame(`translate3d(0, ${distanceY}px, 0)`),
      { transform: "none", opacity: 1 },
    ],
    "fade-down": [
      transformFrame(`translate3d(0, -${distanceY}px, 0)`),
      { transform: "none", opacity: 1 },
    ],
    "fade-left": [
      transformFrame(`translate3d(${distanceX}px, 0, 0)`),
      { transform: "none", opacity: 1 },
    ],
    "fade-right": [
      transformFrame(`translate3d(-${distanceX}px, 0, 0)`),
      { transform: "none", opacity: 1 },
    ],
    "slide-up": [
      transformFrame(`translate3d(0, ${distanceY * 2}px, 0)`, 1),
      { transform: "none", opacity: 1 },
    ],
    "slide-down": [
      transformFrame(`translate3d(0, -${distanceY * 2}px, 0)`, 1),
      { transform: "none", opacity: 1 },
    ],
    "slide-left": [
      transformFrame(`translate3d(${distanceX * 2}px, 0, 0)`, 1),
      { transform: "none", opacity: 1 },
    ],
    "slide-right": [
      transformFrame(`translate3d(-${distanceX * 2}px, 0, 0)`, 1),
      { transform: "none", opacity: 1 },
    ],
    "scale-in": [
      transformFrame(`scale(${config.transform.scale || 0.9})`),
      { transform: "scale(1)", opacity: 1 },
    ],
    "scale-out": [
      transformFrame("scale(1.08)"),
      { transform: "scale(1)", opacity: 1 },
    ],
    "zoom-in": [
      transformFrame("scale(0.72)"),
      { transform: "scale(1)", opacity: 1 },
    ],
    "zoom-out": [
      transformFrame("scale(1.24)"),
      { transform: "scale(1)", opacity: 1 },
    ],
    "rotate-in": [
      transformFrame(`rotate(${config.transform.rotate || -8}deg) scale(0.94)`),
      { transform: "none", opacity: 1 },
    ],
    "flip-x": [
      transformFrame("perspective(800px) rotateX(75deg)"),
      { transform: "perspective(800px) rotateX(0)", opacity: 1 },
    ],
    "flip-y": [
      transformFrame("perspective(800px) rotateY(75deg)"),
      { transform: "perspective(800px) rotateY(0)", opacity: 1 },
    ],
    "blur-in": [
      transformFrame(
        "translateZ(0)",
        0,
        `blur(${config.transform.blurPx || 8}px)`,
      ),
      { transform: "none", opacity: 1, filter: "blur(0)" },
    ],
    "wipe-left": [
      { clipPath: "inset(0 0 0 100%)", opacity: 1 },
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
    ],
    "wipe-right": [
      { clipPath: "inset(0 100% 0 0)", opacity: 1 },
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
    ],
    "clip-reveal": [
      { clipPath: "inset(12% 12% 12% 12% round 16px)", opacity: 0 },
      { clipPath: "inset(0 0 0 0 round 0)", opacity: 1 },
    ],
    "bounce-in": [
      { transform: "scale(0.75)", opacity: 0 },
      { transform: "scale(1.08)", opacity: 1, offset: 0.62 },
      { transform: "scale(0.97)", opacity: 1, offset: 0.82 },
      { transform: "scale(1)", opacity: 1 },
    ],
    "spring-in": [
      { transform: `translate3d(0, ${distanceY}px, 0) scale(0.95)`, opacity: 0 },
      { transform: "translate3d(0, -7px, 0) scale(1.02)", opacity: 1, offset: 0.62 },
      { transform: "translate3d(0, 3px, 0) scale(0.99)", opacity: 1, offset: 0.82 },
      { transform: "none", opacity: 1 },
    ],
    "elastic-in": [
      { transform: "scale(0.65)", opacity: 0 },
      { transform: "scale(1.12)", opacity: 1, offset: 0.5 },
      { transform: "scale(0.94)", opacity: 1, offset: 0.7 },
      { transform: "scale(1.04)", opacity: 1, offset: 0.86 },
      { transform: "scale(1)", opacity: 1 },
    ],
    float: [
      { transform: "translate3d(0, 0, 0)" },
      { transform: `translate3d(0, -${Math.max(6, distanceY / 2)}px, 0)` },
      { transform: "translate3d(0, 0, 0)" },
    ],
    pulse: [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.04)", opacity: 0.88 },
      { transform: "scale(1)", opacity: 1 },
    ],
    shake: [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(0)" },
    ],
    parallax: [
      transformFrame(`translate3d(0, ${parallaxDistance}px, 0)`, 1),
      {
        transform: `translate3d(0, ${-parallaxDistance}px, 0)`,
        opacity: 1,
      },
    ],
    marquee: [
      { transform: "translateX(0)" },
      { transform: "translateX(-25%)" },
    ],
    "text-words": [
      { opacity: 0, transform: "translateY(0.5em)" },
      { opacity: 1, transform: "none" },
    ],
    "text-characters": [
      { opacity: 0, transform: "translateY(0.35em)" },
      { opacity: 1, transform: "none" },
    ],
    typewriter: [{ opacity: 0 }, { opacity: 1 }],
    counter: [
      { opacity: 0, transform: "translateY(0.25em)" },
      { opacity: 1, transform: "none" },
    ],
  };

  const keyframes = definitions[preset] ?? definitions.fade;
  return keyframes ? { keyframes, options: baseOptions } : null;
}
