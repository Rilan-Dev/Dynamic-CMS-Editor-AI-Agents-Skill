# Animation Runtime Reference

## Overview

The Animation Runtime (`components/animations/`) is the **WAAPI playback engine** - separate from the editor, consumes published `AnimationConfig` from CMS docs.

## Architecture

```
components/animations/
├── types.ts                    # AnimationConfig (duplicated), ResolvedAnimationConfig
├── presets.ts                  # animationDefinition() → WAAPI keyframes
├── resolveAnimationConfig.ts   # 6-layer config merge
├── useAnimationRuntime.ts      # WAAPI playback hook
├── AnimationProvider.tsx       # Context providers
├── AnimatedElement.tsx         # Component wrapper
├── AnimatedSection.tsx         # Section wrapper
├── AnimatedPage.tsx            # Page wrapper
├── targetRegistry.ts           # Client-side target registry
├── PageTransitionBoundary.tsx  # Click-intercept navigation
├── EditableAnimationTarget.tsx # Lazy-loaded editor overlay
└── PageTransitionBoundary.tsx  # Click-intercept page transitions
```

## Core Types

```typescript
// components/animations/types.ts

export interface AnimationConfig {
  enabled?: boolean;
  mode?: AnimationScopeMode;        // inherit | override | combine | disabled
  preset?: AnimationPreset;         // ~35 presets
  trigger?: AnimationTrigger;       // page-load | in-view | hover | click | scroll-progress
  timing?: AnimationTiming;         // durationMs, delayMs, staggerMs, easing, repeat
  viewport?: AnimationViewport;     // threshold, rootMargin, once, replayOnReentry
  devices?: AnimationDevices;       // desktop, tablet, mobile, reducedMotion
  transform?: AnimationTransform;   // x, y, scale, rotate, opacity, blurPx
  applyToChildren?: boolean;
  sequence?: AnimationStep[];       // For combine mode
}

export const DEFAULT_ANIMATION_CONFIG: ResolvedAnimationConfig = {
  enabled: true,
  mode: "inherit",
  preset: "none",
  trigger: "in-view",
  timing: { durationMs: 600, delayMs: 0, staggerMs: 0, easing: "ease-out", repeat: 0, direction: "normal", playbackRate: 1, spring: { stiffness: 170, damping: 26, mass: 1 } },
  viewport: { threshold: 0.15, rootMargin: "0px 0px -10% 0px", once: true, replayOnReentry: false, reverseOnExit: false, scrub: false, scrubSmoothing: 0.15, parallaxStrength: 0 },
  devices: { desktop: true, tablet: true, mobile: true, reducedMotion: "disable" },
  transform: { x: 0, y: 24, scale: 0.96, rotate: 0, opacity: 0, blurPx: 8 },
  applyToChildren: false,
  sequence: [],
};
```

## 6-Layer Config Resolution

```typescript
// resolveAnimationConfig.ts

export function resolveAnimationConfig(
  layers: Array<AnimationConfig | undefined>,
  device: AnimationDevice,
  reducedMotion: boolean
): ResolvedAnimationConfig {
  let resolved = cloneResolved();  // Start with DEFAULT_ANIMATION_CONFIG

  layers.forEach((layer, index) => {
    if (!layer) return;
    if (layer.mode === "disabled" || layer.enabled === false) {
      resolved = { ...resolved, enabled: false, mode: "disabled", sequence: [] };
      return;
    }
    if (layer.mode === "inherit") return;
    if (layer.mode === "combine") {
      const step = combineStep(layer, index);
      resolved = { ...resolved, enabled: layer.enabled ?? resolved.enabled, ... };
      return;
    }
    resolved = mergeConfig(resolved, layer);  // Deep merge
  });

  if (!resolved.devices[device]) return { ...resolved, enabled: false, sequence: [] };
  return applyReducedMotion(resolved, reducedMotion);
}

// Merge: layer overrides base, deep-merge nested objects
const mergeConfig = (base, layer) => ({
  ...base,
  enabled: layer.enabled ?? base.enabled,
  mode: layer.mode ?? base.mode,
  preset: layer.preset ?? base.preset,
  timing: { ...base.timing, ...layer.timing, spring: { ...base.timing.spring, ...layer.timing?.spring } },
  viewport: { ...base.viewport, ...layer.viewport },
  devices: { ...base.devices, ...layer.devices },
  transform: { ...base.transform, ...layer.transform },
  applyToChildren: layer.applyToChildren ?? base.applyToChildren,
  sequence: layer.sequence ? layer.sequence.map(...) : base.sequence,
});
```

## Mode Semantics

| Mode | Behavior |
|------|----------|
| `disabled` | Kill - disable animation entirely |
| `inherit` | Skip - don't apply this layer |
| `combine` | Append to `sequence[]` (chaining) |
| `override` | Deep-merge (default) |

## Reduced Motion Handling

```typescript
const applyReducedMotion = (config, reducedMotion) => {
  if (!reducedMotion) return config;
  switch (config.devices.reducedMotion) {
    case "fade": return { ...config, preset: "fade", timing: { ...config.timing, durationMs: Math.min(config.timing.durationMs, 200), delayMs: 0, staggerMs: 0, repeat: 0 }, viewport: { ...config.viewport, scrub: false, reverseOnExit: false, parallaxStrength: 0 }, sequence: [] };
    case "instant": return { ...config, preset: "none", timing: { durationMs: 0, delayMs: 0, staggerMs: 0, repeat: 0 }, sequence: [] };
    case "disable": default: return { ...config, enabled: false, sequence: [] };
  }
}
```

## Presets (WAAPI Keyframes)

```typescript
// presets.ts
export function animationDefinition(preset, config): AnimationDefinition | null {
  if (!config.enabled || preset === "none") return null;

  const distanceX = Math.abs(config.transform.x) || 36;
  const distanceY = Math.abs(config.transform.y) || 28;
  const parallaxDistance = config.viewport.parallaxStrength === 0 ? distanceY : config.viewport.parallaxStrength;

  const definitions: Partial<Record<AnimationPreset, Keyframe[]>> = {
    fade: [{ opacity: 0 }, { opacity: 1 }],
    "fade-up": [transformFrame(`translate3d(0, ${distanceY}px, 0)`), { transform: "none", opacity: 1 }],
    "fade-down": [transformFrame(`translate3d(0, -${distanceY}px, 0)`), { transform: "none", opacity: 1 }],
    "slide-left": [transformFrame(`translate3d(${distanceX * 2}px, 0, 0)`, 1), { transform: "none", opacity: 1 }],
    "slide-right": [transformFrame(`translate3d(-${distanceX * 2}px, 0, 0)`, 1), { transform: "none", opacity: 1 }],
    "scale-in": [transformFrame(`scale(${config.transform.scale || 0.9})`), { transform: "scale(1)", opacity: 1 }],
    "scale-out": [transformFrame("scale(1.08)"), { transform: "scale(1)", opacity: 1 }],
    "parallax": [transformFrame(`translate3d(0, ${parallaxDistance}px, 0)`, 1), { transform: `translate3d(0, ${-parallaxDistance}px, 0)`, opacity: 1 }],
    // ... 30+ presets
  };

  const keyframes = definitions[preset] ?? definitions.fade;
  return keyframes ? { keyframes, options: baseOptions } : null;
}
```

## Runtime Hook

```typescript
// useAnimationRuntime.ts
export function useAnimationRuntime(
  ref: RefObject<HTMLElement | null>,
  config: ResolvedAnimationConfig,
  staggerIndex = 0,
  targetId?: string
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const play = async () => {
      const definition = animationDefinition(config.preset, config);
      if (!definition) return;
      const animation = element.animate(definition.keyframes, definition.options);
      activeAnimations.add(animation);
      // ... trigger handling
    };

    // Triggers: in-view, hover, focus, click, page-load, scroll-progress
    // Scroll-linked: animation.pause() + currentTime = progress * duration
    // Replay/Cancel: window events `cms-animation-replay:{id}` / `cms-animation-cancel:{id}`

    return () => { disposed = true; observer?.disconnect(); ... };
  }, [config, ref, staggerIndex, targetId]);
}
```

## Context Providers

```typescript
// AnimationProvider.tsx
export function AnimationProvider({ siteAnimations, children }) {
  const liveAnimations = useSection(["animations"], siteAnimations, "site");
  return <SiteAnimationsContext.Provider value={liveAnimations}>{children}</SiteAnimationsContext.Provider>;
}

export function PageAnimationProvider({ pageId, pageAnimations, children }) {
  const liveAnimations = useSection(["animations"], pageAnimations);
  return <PageAnimationsContext.Provider value={liveAnimations}>...</PageAnimationsContext.Provider>;
}

export function SectionAnimationProvider({ sectionId, children }) {
  return <SectionContext.Provider value={sectionId}>{children}</SectionContext.Provider>;
}

// Consumer
export function useResolvedAnimationConfig({ type, targetId, sectionId }) {
  const siteAnimations = useContext(SiteAnimationsContext);
  const pageAnimations = useContext(PageAnimationsContext);
  const preferences = useDevicePreferences();
  const previewConfig = useAnimationPreviewConfig(targetId);

  return useMemo(() => resolveAnimationConfig(layers, ...), [pageAnimations, preferences, previewConfig, ...]);
}
```

## Target Registry

```typescript
// targetRegistry.ts
const targets = new Map<string, AnimationTarget>();

export function registerAnimationTarget(target: AnimationTarget) {
  targets.set(target.id, target);
  return () => targets.delete(target.id);
}

export function getTargetsByType(type: AnimationTargetType): AnimationTarget[] {
  return Array.from(targets.values()).filter(t => t.type === type);
}
```

## Component Wrappers

```tsx
// AnimatedElement.tsx
export function AnimatedElement({ id, type, label, sectionId, staggerIndex, ...props }) {
  const targetId = id.startsWith("component:") ? id : `component:${resolvedSection}:${id}`;
  const config = useResolvedAnimationConfig({ type, targetId, sectionId: resolvedSection === "page" ? undefined : resolvedSection });
  
  useAnimationRuntime(ref, config, staggerIndex, targetId);
  
  useEffect(() => registerAnimationTarget({ id: targetId, type, label, pageId, sectionId, element: ref.current }), [label, pageId, resolvedSection, targetId, type]);
  
  return (
    <Tag ref={ref} data-animation-target={targetId} data-animation-type={type}>
      {children}
      <EditableAnimationTarget target={{ id: targetId, type, label, pageId, sectionId, element: ref.current }} />
    </Tag>
  );
}

// AnimatedSection.tsx - targetId = `section:${id}`
// AnimatedPage.tsx - targetId = `page:${id}`
```

## Page Transitions

```typescript
// PageTransitionBoundary.tsx
export function PageTransitionBoundary({ children, config, fallback }) {
  const router = useRouter();
  const pathname = usePathname();
  const siteTransition = useSection(["animations", "pageTransition"], config, "site");
  
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest("[data-cms-ui]")) return;
      e.preventDefault();
      const href = e.currentTarget.href;
      if (!href) return;
      
      runExitAnimation().then(() => router.push(href));
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [config]);

  return children;
}
```

## Target IDs

| Wrapper | Target ID Format | Example |
|---------|------------------|---------|
| `AnimatedPage` | `page:${id}` | `page:home` |
| `AnimatedSection` | `section:${id}` | `section:hero` |
| `AnimatedElement` | `component:${section}:${id}` | `component:hero:hero-title` |

## Key Conventions

| Aspect | Convention |
|--------|------------|
| **Types duplicated** | `AnimationConfig` in editor + runtime (portability) |
| **Runtime expects** | `ResolvedAnimationConfig` (all fields defaulted) |
| **Target ID format** | `page:${id}`, `section:${id}`, `component:${section}:${id}` |
| **Page transition** | Stored at `site.animations.pageTransition` |
| **Target registry** | Client-side Map, cleaned on unmount |
| **Scroll-linked** | `animation.pause() + currentTime = progress * duration` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not wrapping page in `<AnimatedPage>` | Page animations + section/component resolution won't work |
| Missing `animations` prop on `<AnimatedPage>` | Runtime gets `{}` context |
| Target ID mismatch | Use `component:${section}:${id}` format consistently |
| Missing `data-animation-target` | Required for target registry + overlay |
| Forgetting `registerAnimationTarget` cleanup | Memory leaks, duplicate targets |