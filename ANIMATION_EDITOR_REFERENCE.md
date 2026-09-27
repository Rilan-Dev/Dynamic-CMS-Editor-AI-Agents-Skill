# Animation Editor Reference

## Overview

The Animation Editor is a **self-contained, portable package** (`components/animation-editor/`) that provides intent-driven animation authoring. It can be copy-pasted into any Next.js app.

## Architecture

```
components/animation-editor/
├── core/                    # Pure schema + intent model (NO React)
│   ├── types.ts              # AnimationConfig, AnimationEditorAdapter interface
│   ├── intents.ts            # DEFAULT_ANIMATION_INTENTS catalog
│   ├── intent-mapper.ts      # intent ↔ config bijection
│   ├── scope.ts              # 5 apply-scope kinds
│   ├── page-transitions.ts   # Page transition intents
│   ├── preview-state.ts      # External preview store
│   └── undo.ts               # Undo receipts
├── runtime/                  # React glue
│   ├── AnimationEditorProvider.tsx
│   ├── AnimationTargetOverlay.tsx
│   ├── active-popover.ts
│   └── usePopoverFocus.ts
├── ui/                       # Presentational widgets
│   ├── AnimationPopover.tsx
│   ├── AnimationIntentGallery.tsx
│   └── [widgets]
├── styles/                   # CSS for editor
├── index.ts                  # Public API exports
├── portability.test.ts       # Self-contained test
└── README.md                 # Portability docs
```

## Core Types

```typescript
// components/animation-editor/core/types.ts

export interface AnimationConfig {
  enabled?: boolean;
  mode?: AnimationScopeMode;        // inherit | override | combine | disabled
  preset?: AnimationPreset;         // ~32 presets
  trigger?: AnimationTrigger;       // page-load | in-view | hover | click | scroll-progress
  timing?: AnimationTiming;
  viewport?: AnimationViewport;
  devices?: AnimationDevices;
  transform?: AnimationTransform;
  applyToChildren?: boolean;
  sequence?: AnimationStep[];
}

export type AnimationScopeMode = "inherit" | "override" | "combine" | "disabled";
export type AnimationPreset = "fade" | "slide-left" | "slide-right" | "scale" | ...;
export type AnimationTrigger = "page-load" | "in-view" | "hover" | "click" | "scroll-progress" | ...;

export interface AnimationEditorAdapter {
  getDraftConfig(target, scope): AnimationConfig;
  getPublishedConfig(target, scope): AnimationConfig;
  getAvailableScopes(target): AnimationScopeOption[];
  preview(target, config): void;
  clearPreview(target): void;
  replay(target): void;
  cancel(target): void;
  saveDraft(input: SaveAnimationDraftInput): Promise<AnimationDraftReceipt>;
  undo(receipt: AnimationDraftReceipt): Promise<void>;
  resetDraft(input: ResetAnimationDraftInput): Promise<void>;
  subscribeStatus(listener): () => void;
}
```

## Intent Model

**Plain-language intents** are the canonical editorial surface:

```typescript
// core/intents.ts
export const DEFAULT_ANIMATION_INTENTS = [
  { id: "appear-softly", group: "entrance", title: "Appear softly", ... },
  { id: "rise-gently", group: "entrance", title: "Rise gently", ... },
  { id: "slide-left", group: "entrance", title: "Slide from left", ... },
  // ... 28+ intents across groups: entrance, attention, interaction, scroll, none
];

// Intent → Config (one-way projection)
export function mapIntentToConfig(input: MapIntentInput): AnimationConfig {
  const intent = DEFAULT_ANIMATION_INTENTS.find(c => c.id === input.intentId);
  const base = { mode: "override", enabled: true, timing, viewport, trigger };
  // Switch on intentId → add preset, transform, etc.
  return { ...base, preset: "fade-up", transform: { y: DISTANCE[strength] } };
}

// Reverse mapping for round-trip
export function recognizeIntent(config: AnimationConfig): { intentId: string; exact: boolean }
```

## Adapter Contract (Host Implementation)

```typescript
// components/cms/animation/SmtsAnimationEditorAdapter.ts

export function createSmtsAnimationEditorAdapter(): AnimationEditorAdapter {
  return {
    getDraftConfig: (target, scope) => readConfig(target, scope, false),
    getPublishedConfig: (target, scope) => readConfig(target, scope, true),
    getAvailableScopes(target) { /* buildScopeOptions */ },
    preview(target) { replayAfterRender(target.id); },
    clearPreview(target) { cancelAnimationTarget(target.id); replayAfterRender(target.id); },
    replay(target) { replayAfterRender(target.id); },
    cancel(target) { cancelAnimationTarget(target.id); },
    
    async saveDraft(input) {
      emit("unsaved");
      const locations = pathForScope(input.target, input.scope);
      const changes = locations.map(location => {
        const document = getEditingDoc(location.document);
        const previousValue = document ? getAtPath(document, location.path) : undefined;
        return { document: location.document, path: [...location.path], previousValue: cloneValue(previousValue), nextValue: cloneValue(input.config) };
      });
      emit("saving");
      locations.forEach(location => setPath(location.path, structuredClone(input.config), location.document));
      emit("saved");
      return createUndoReceipt(input.label, changes);
    },
    
    async undo(receipt) { /* ... */ },
    async resetDraft(input) { /* ... */ },
    subscribeStatus(listener) { /* ... */ },
  };
}
```

## Scope System (5 Kinds)

| Scope Kind | Target | Path Pattern |
|------------|--------|--------------|
| `target` | Single element | `animations.components[targetId]` |
| `similar-page` | All same-type on page | Multiple `components[id]` |
| `section` | Entire section | `animations.sections[sectionId]` |
| `page` | Entire page | `animations.page` |
| `global` | Site-wide defaults | `animations.defaultsByType[type]` or `animations.global` |

```typescript
// components/cms/animation/scopePaths.ts
export function pathForScope(target, scope): AnimationScopePath[] {
  switch (scope.kind) {
    case "target":
      return [{ document: "page", path: ["animations", "components", scope.targetId] }];
    case "similar-page":
      return scope.targetIds.map(id => ({ document: "page", path: ["animations", "components", id] }));
    case "section":
      return [{ document: "page", path: ["animations", "sections", scope.sectionId] }];
    case "page":
      return [{ document: "page", path: ["animations", "page"] }];
    case "global":
      return [{ document: "site", path: scope.targetType ? ["animations", "defaultsByType", scope.targetType] : ["animations", "global"] }];
  }
}
```

## Preview System

```typescript
// core/preview-state.ts
export function createPreviewStore(): AnimationPreviewStore {
  const values = new Map<string, AnimationConfig>();
  return {
    set(targetId, config) { values.set(targetId, structuredClone(config)); emit(); },
    clear(targetId) { if (values.delete(targetId)) emit(); },
    get(targetId) { return values.get(targetId); },
    resolve(targetId, draft) { return values.get(targetId) ?? draft; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}

// Runtime reads preview via useAnimationPreviewConfig(targetId)
// Preview store = LAST layer in resolveAnimationConfig (overrides everything)
```

## Portability Rules (Enforced by `portability.test.ts`)

**Must NOT import:**
- `@/components/cms`
- `@/components/animations`
- `@/lib/services`
- `@/content/registry`
- `useAnimationRuntime`
- `targetRegistry`

**Self-contained:** Copy `components/animation-editor/` to any Next.js app, provide `AnimationEditorAdapter` implementation.

## Integration (Host App)

```tsx
// app/layout.tsx
<AnimationProvider siteAnimations={siteAnimations}>
  <SmtsAnimationEditorProvider>
    <PageTransitionBoundary config={pageTransition}>
      <CmsRoot />
      {children}
    </PageTransitionBoundary>
  </SmtsAnimationEditorProvider>
</AnimationProvider>

// components/cms/animation/SmtsAnimationEditorProvider.tsx
export function SmtsAnimationEditorProvider({ children }) {
  const { editing, ready } = useCmsEditing();
  const adapter = useMemo(() => createSmtsAnimationEditorAdapter(), []);
  return (
    <AnimationEditorProvider enabled={editing && ready} adapter={adapter} coordinator={cmsActivePopover}>
      {children}
    </AnimationEditorProvider>
  );
}
```

## Key Conventions

| Aspect | Convention |
|--------|------------|
| **Intent-first** | User picks plain-language intent → maps to numeric config |
| **Draft only** | Editor never publishes; Publish is CMS-side |
| **Preview ≠ Saved** | Status: `idle | previewing | unsaved | saving | saved | error` |
| **Portability** | No host imports in `core/`; adapter = host contract |
| **Data attributes** | `data-cms-ui` on editor UI; `data-animation-target` on elements |
| **Reduced motion** | Honored in preview + page transitions via `prefers-reduced-motion` |

## Portability Test

```typescript
// portability.test.ts
test("no host imports", () => {
  const files = getAllSourceFiles("components/animation-editor");
  files.forEach(file => {
    const content = readFileSync(file, "utf8");
    expect(content).not.toContain("@/components/cms");
    expect(content).not.toContain("@/components/animations");
    expect(content).not.toContain("@/lib/services");
    expect(content).not.toContain("@/content/registry");
    expect(content).not.toContain("useAnimationRuntime");
    expect(content).not.toContain("targetRegistry");
  });
});
```