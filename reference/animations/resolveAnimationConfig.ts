import {
  DEFAULT_ANIMATION_CONFIG,
  type AnimationConfig,
  type AnimationDevice,
  type AnimationStep,
  type ResolvedAnimationConfig,
} from "./types";

const cloneResolved = (): ResolvedAnimationConfig => ({
  ...DEFAULT_ANIMATION_CONFIG,
  timing: {
    ...DEFAULT_ANIMATION_CONFIG.timing,
    spring: { ...DEFAULT_ANIMATION_CONFIG.timing.spring },
  },
  viewport: { ...DEFAULT_ANIMATION_CONFIG.viewport },
  devices: { ...DEFAULT_ANIMATION_CONFIG.devices },
  transform: { ...DEFAULT_ANIMATION_CONFIG.transform },
  sequence: DEFAULT_ANIMATION_CONFIG.sequence.map((step) => ({ ...step })),
});

const mergeConfig = (
  base: ResolvedAnimationConfig,
  layer: AnimationConfig,
): ResolvedAnimationConfig => ({
  ...base,
  enabled: layer.enabled ?? base.enabled,
  mode: layer.mode ?? base.mode,
  preset: layer.preset ?? base.preset,
  trigger: layer.trigger ?? base.trigger,
  timing: {
    ...base.timing,
    ...layer.timing,
    spring: {
      ...base.timing.spring,
      ...layer.timing?.spring,
    },
  },
  viewport: {
    ...base.viewport,
    ...layer.viewport,
  },
  devices: {
    ...base.devices,
    ...layer.devices,
  },
  transform: {
    ...base.transform,
    ...layer.transform,
  },
  applyToChildren: layer.applyToChildren ?? base.applyToChildren,
  sequence: layer.sequence
    ? layer.sequence.map((step) => ({
        ...step,
        timing: step.timing ? { ...step.timing, spring: { ...step.timing.spring } } : undefined,
        viewport: step.viewport ? { ...step.viewport } : undefined,
        transform: step.transform ? { ...step.transform } : undefined,
      }))
    : base.sequence,
});

const combineStep = (layer: AnimationConfig, index: number): AnimationStep | null => {
  if (!layer.preset || layer.preset === "none") return null;
  return {
    id: `combined-${index}`,
    preset: layer.preset,
    trigger: layer.trigger,
    timing: layer.timing
      ? {
          ...layer.timing,
          spring: layer.timing.spring ? { ...layer.timing.spring } : undefined,
        }
      : undefined,
    viewport: layer.viewport ? { ...layer.viewport } : undefined,
    transform: layer.transform ? { ...layer.transform } : undefined,
  };
};

const applyReducedMotion = (
  config: ResolvedAnimationConfig,
  reducedMotion: boolean,
): ResolvedAnimationConfig => {
  if (!reducedMotion) return config;

  switch (config.devices.reducedMotion) {
    case "fade":
      return {
        ...config,
        preset: "fade",
        timing: {
          ...config.timing,
          durationMs: Math.min(config.timing.durationMs, 200),
          delayMs: 0,
          staggerMs: 0,
          repeat: 0,
        },
        viewport: {
          ...config.viewport,
          scrub: false,
          reverseOnExit: false,
          parallaxStrength: 0,
        },
        sequence: [],
      };
    case "instant":
      return {
        ...config,
        preset: "none",
        timing: {
          ...config.timing,
          durationMs: 0,
          delayMs: 0,
          staggerMs: 0,
          repeat: 0,
        },
        sequence: [],
      };
    case "disable":
    default:
      return { ...config, enabled: false, sequence: [] };
  }
};

export function resolveAnimationConfig(
  layers: Array<AnimationConfig | undefined>,
  device: AnimationDevice,
  reducedMotion: boolean,
): ResolvedAnimationConfig {
  let resolved = cloneResolved();

  layers.forEach((layer, index) => {
    if (!layer) return;
    if (layer.mode === "disabled" || layer.enabled === false) {
      resolved = { ...resolved, enabled: false, mode: "disabled", sequence: [] };
      return;
    }
    if (layer.mode === "inherit") return;
    if (layer.mode === "combine") {
      const step = combineStep(layer, index);
      resolved = {
        ...resolved,
        enabled: layer.enabled ?? resolved.enabled,
        devices: { ...resolved.devices, ...layer.devices },
        applyToChildren: layer.applyToChildren ?? resolved.applyToChildren,
        sequence: step ? [...resolved.sequence, step] : resolved.sequence,
      };
      return;
    }
    resolved = mergeConfig(resolved, layer);
  });

  if (!resolved.devices[device]) {
    return { ...resolved, enabled: false, sequence: [] };
  }

  return applyReducedMotion(resolved, reducedMotion);
}
