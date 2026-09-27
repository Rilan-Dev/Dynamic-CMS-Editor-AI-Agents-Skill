import {
  DEFAULT_ANIMATION_INTENTS,
  DIRECT_PRESET_IDS,
} from "./intents";
import type {
  AnimationConfig,
  AnimationDelayChoice,
  AnimationIntentDefaults,
  AnimationPreset,
  AnimationRepetition,
  AnimationSpeed,
  AnimationStrength,
  AnimationStaggerChoice,
  AnimationTrigger,
} from "./types";

const DURATION: Record<AnimationSpeed, number> = { slow: 900, normal: 600, fast: 320 };
const DELAY: Record<AnimationDelayChoice, number> = { none: 0, slight: 120, noticeable: 280 };
const DISTANCE: Record<AnimationStrength, number> = { gentle: 18, balanced: 34, bold: 56 };
const SCALE: Record<AnimationStrength, number> = { gentle: 0.96, balanced: 0.9, bold: 0.8 };
const STAGGER: Record<AnimationStaggerChoice, number> = { together: 0, sequence: 90, relaxed: 160 };

const isDirectPresetIntent = (value: string): value is AnimationPreset =>
  (DIRECT_PRESET_IDS as readonly string[]).includes(value);

export interface MapIntentInput {
  intentId: string;
  strength: AnimationStrength;
  speed: AnimationSpeed;
  delay: AnimationDelayChoice;
  repetition: AnimationRepetition;
  trigger?: AnimationTrigger;
  stagger?: AnimationStaggerChoice;
}

export function mapIntentToConfig(input: MapIntentInput): AnimationConfig {
  const intent = DEFAULT_ANIMATION_INTENTS.find((candidate) => candidate.id === input.intentId);
  const trigger = input.trigger && intent?.allowedTriggers.includes(input.trigger)
    ? input.trigger
    : intent?.defaults.trigger ?? "in-view";
  const timing = {
    durationMs: DURATION[input.speed],
    delayMs: DELAY[input.delay],
    easing: "ease-out",
    repeat: input.repetition === "continuous" ? "infinite" as const : 0,
    staggerMs: input.stagger ? STAGGER[input.stagger] : 0,
  };
  const viewport = {
    once: input.repetition === "once",
    replayOnReentry: input.repetition === "on-reentry",
  };
  const base: AnimationConfig = {
    mode: "override",
    enabled: true,
    timing,
    viewport,
    trigger,
  };

  switch (input.intentId) {
    case "appear-softly":
      return { ...base, preset: "fade" };
    case "rise-gently":
      return { ...base, preset: "fade-up", transform: { y: DISTANCE[input.strength], opacity: 0 } };
    case "drop-gently":
      return { ...base, preset: "fade-down", transform: { y: -DISTANCE[input.strength], opacity: 0 } };
    case "slide-left":
      return { ...base, preset: "slide-right", transform: { x: -DISTANCE[input.strength] } };
    case "slide-right":
      return { ...base, preset: "slide-left", transform: { x: DISTANCE[input.strength] } };
    case "grow-smoothly":
      return { ...base, preset: "scale-in", transform: { scale: SCALE[input.strength] } };
    case "blur-focus":
      return { ...base, preset: "blur-in", transform: { blurPx: DISTANCE[input.strength] / 4, opacity: 0 } };
    case "gentle-pulse":
      return { ...base, preset: "pulse" };
    case "float-softly":
      return { ...base, preset: "float", transform: { y: DISTANCE[input.strength] } };
    case "bounce-once":
      return { ...base, preset: "bounce-in" };
    case "react-hover":
      return { ...base, preset: "scale-in", trigger: "hover", transform: { scale: SCALE[input.strength] } };
    case "react-click":
      return { ...base, preset: "pulse", trigger: "click" };
    case "move-scroll":
      return {
        ...base,
        preset: "parallax",
        trigger: "scroll-progress",
        viewport: { ...viewport, scrub: true, parallaxStrength: DISTANCE[input.strength] },
      };
    case "none":
      return { mode: "disabled", enabled: false, preset: "none" };
    default:
      return isDirectPresetIntent(input.intentId)
        ? { ...base, preset: input.intentId }
        : { ...base, preset: "fade" };
  }
}

export function recognizeIntent(config: AnimationConfig): { intentId: string; exact: boolean } {
  if (Object.keys(config).length === 0 || config.mode === "inherit") {
    return { intentId: "inherited", exact: true };
  }
  if (config.enabled === false || config.mode === "disabled" || config.preset === "none") {
    return { intentId: "none", exact: true };
  }
  if (config.preset === "fade") return { intentId: "appear-softly", exact: true };
  if (config.preset === "fade-up" && !config.transform?.rotate) {
    return { intentId: "rise-gently", exact: true };
  }
  if (config.preset === "fade-down" && !config.transform?.rotate) {
    return { intentId: "drop-gently", exact: true };
  }
  if (config.preset === "slide-right") return { intentId: "slide-left", exact: true };
  if (config.preset === "slide-left") return { intentId: "slide-right", exact: true };
  if (config.preset === "scale-in" && config.trigger === "hover") {
    return { intentId: "react-hover", exact: true };
  }
  if (config.preset === "scale-in") return { intentId: "grow-smoothly", exact: true };
  if (config.preset === "blur-in") return { intentId: "blur-focus", exact: true };
  if (config.preset === "pulse" && config.trigger === "click") {
    return { intentId: "react-click", exact: true };
  }
  if (config.preset === "pulse") return { intentId: "gentle-pulse", exact: true };
  if (config.preset === "float") return { intentId: "float-softly", exact: true };
  if (config.preset === "bounce-in") return { intentId: "bounce-once", exact: true };
  if (config.preset === "parallax" || config.trigger === "scroll-progress") {
    return { intentId: "move-scroll", exact: true };
  }
  if (config.preset && isDirectPresetIntent(config.preset)) {
    return { intentId: config.preset, exact: true };
  }
  if (config.trigger === "hover") return { intentId: "react-hover", exact: true };
  return { intentId: "custom", exact: false };
}

export function deriveIntentDefaults(
  config: AnimationConfig,
  fallback: AnimationIntentDefaults,
): AnimationIntentDefaults {
  const distance = Math.max(
    Math.abs(config.transform?.x ?? 0),
    Math.abs(config.transform?.y ?? 0),
    Math.abs(config.viewport?.parallaxStrength ?? 0),
    Math.abs(config.transform?.blurPx ?? 0) * 4,
    Math.abs(1 - (config.transform?.scale ?? 1)) * 280,
  );
  const strength: AnimationStrength =
    distance >= 46 ? "bold" : distance >= 26 ? "balanced" : "gentle";

  const duration = config.timing?.durationMs ?? DURATION[fallback.speed];
  const speed: AnimationSpeed = duration <= 400 ? "fast" : duration >= 800 ? "slow" : "normal";

  const delayMs = config.timing?.delayMs ?? DELAY[fallback.delay];
  const delay: AnimationDelayChoice =
    delayMs >= 220 ? "noticeable" : delayMs >= 60 ? "slight" : "none";

  const repetition: AnimationRepetition =
    config.timing?.repeat === "infinite"
      ? "continuous"
      : config.viewport?.replayOnReentry
        ? "on-reentry"
        : "once";

  const staggerMs = config.timing?.staggerMs ?? STAGGER[fallback.stagger ?? "together"];
  const stagger: AnimationStaggerChoice =
    staggerMs >= 130 ? "relaxed" : staggerMs >= 50 ? "sequence" : "together";

  return {
    strength,
    speed,
    delay,
    trigger: config.trigger ?? fallback.trigger,
    repetition,
    stagger,
  };
}
