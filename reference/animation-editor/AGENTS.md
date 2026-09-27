# components/animation-editor — Intent-driven animation authoring

## OVERVIEW

Self-contained, portable editor package (own `README.md` + `index.ts` + `portability.test.ts`). Editors pick plain-language **intents** which are mapped to a numeric `AnimationConfig`. `core/` has no React — the folder is designed to be copy-pasted into other Next apps.

## LAYERS

- `core/` — pure schema + intent model (no React):
  - `types.ts` — `AnimationConfig`, `AnimationApplyScope` (target | similar-page | section | page | global), `AnimationEditorAdapter` interface, `AnimationDraftStatus`.
  - `intents.ts` — `DEFAULT_ANIMATION_INTENTS` catalog (entrance/attention/interaction/scroll/none).
  - `intent-mapper.ts` — `mapIntentToConfig` / `recognizeIntent` / `deriveIntentDefaults` (intent ↔ config round-trip).
  - `scope.ts`, `page-transitions.ts`, `preview-state.ts`, `undo.ts`.
- `runtime/` — React glue: `AnimationEditorProvider` (context + `useAnimationPreviewConfig`), `AnimationTargetOverlay` (portal'd badge), `active-popover`, `popover-position`, `usePopoverFocus`.
- `ui/` — presentational widgets: `AnimationPopover` (orchestrator), intent gallery/cards, scope picker, fine-tune, draft status, `PageTransitionEditor`.

## INTENT MODEL

- User picks intent + strength/speed/delay/repetition/trigger/stagger → `mapIntentToConfig` fills numbers.
- `recognizeIntent` reverses for initial state; `deriveIntentDefaults` maps numeric→categorical for sliders.
- The editor **never edits raw `AnimationConfig` directly** — intent is the canonical editorial surface.

## ADAPTER CONTRACT

Host implements `AnimationEditorAdapter` (`core/types.ts`): `getDraftConfig/getPublishedConfig/getAvailableScopes/preview/clearPreview/replay/cancel/saveDraft/undo/resetDraft/subscribeStatus` (+ page-transition methods). Reference impl: `components/cms/animation/SmtsAnimationEditorAdapter.ts`.

## SELF-CONTAINED RULE (enforced by `portability.test.ts`)

Must not import `@/components/cms`, `@/components/animations`, `@/lib/services`, `@/content/registry`, `useAnimationRuntime`, or `targetRegistry`. New files here must stay free of host (SMTS) dependencies.

## GOTCHAS

- Editor **drafts only** — never publishes (publish is CMS-side).
- `preview ≠ saved`; status state machine `idle | previewing | unsaved | saving | saved | error`.
- `data-cms-ui` marks editor elements (PageTransitionBoundary skips them); `data-animation-target` / `data-page-transition-root` selectors are shared with the runtime.
- `prefers-reduced-motion` honored in preview + page-transition keyframes.
