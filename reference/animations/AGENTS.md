# components/animations — WAAPI playback runtime

## OVERVIEW

Runtime playback engine (Web Animations API). Separate from `animation-editor`; consumes published `AnimationConfig` from CMS docs. Duplicates its own `AnimationConfig` types (self-contained rule).

## KEY MODULES

- `types.ts` — `AnimationConfig` (duplicated from editor) + `ResolvedAnimationConfig` (all fields defaulted) + `PageTransitionConfig`.
- `presets.ts` — `animationDefinition(preset, config)` → WAAPI keyframes/options (~30 presets).
- `resolveAnimationConfig.ts` — 6-layer merge: `site.global → defaultsByType[type] → page.page → sections[sectionId] → components[targetId] → preview`.
- `useAnimationRuntime.ts` — IntersectionObserver / hover / focus / click triggers; scroll-linked via `animation.pause() + currentTime = progress*duration`; listens for `cms-animation-replay:{id}` / `cms-animation-cancel:{id}` window events.
- `AnimationProvider.tsx` — nested contexts: `AnimationProvider → PageAnimationProvider → SectionAnimationProvider`.
- `AnimatedElement/Section/Page.tsx` — thin wrappers setting `data-animation-target`/`data-animation-type`.
- `targetRegistry.ts` — client-side Map of mounted targets (clean up in `useEffect`).
- `PageTransitionBoundary.tsx` — intercepts `<a>` clicks, runs WAAPI exit/enter, `router.push()`.

## MODE SEMANTICS (resolveAnimationConfig)

`disabled` (kill) | `inherit` (skip) | `combine` (append to `sequence[]`) | `override` (deep-merge). `reducedMotion`: `disable | fade | instant`.

## EDITOR ↔ RUNTIME BOUNDARY

- Editor previews override runtime via `useAnimationPreviewConfig` (last merge layer).
- Window events `cms-animation-replay:{id}` / `cms-animation-cancel:{id}` trigger replay/cancel.

## GOTCHAS

- `AnimationConfig` types are **intentionally duplicated** vs the editor — do not unify (portability contract).
- Runtime expects `Resolved*` variants (all fields defaulted).
- `targetRegistry` entries must be removed on unmount.
- `prefers-reduced-motion` honored in both `useAnimationRuntime` and `PageTransitionBoundary`.
