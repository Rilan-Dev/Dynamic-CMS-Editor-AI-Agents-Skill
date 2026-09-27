# Reusable Animation Editor

A zero-technical, on-page animation editor for React applications.

The folder is self-contained. It does not import the SMTS CMS, content registry, services, animation runtime implementation, Radix UI, or project-specific page code.

## What to copy

Copy the complete folder:

```text
components/animation-editor/
```

Import both style files once in the host application:

```ts
import "./components/animation-editor/styles/animation-editor.css";
import "./components/animation-editor/styles/animation-editor-dark.css";
```

## Public integration

Wrap the editable page with `AnimationEditorProvider` and provide an adapter:

```tsx
import {
  AnimationEditorProvider,
  type AnimationApplyScope,
  type AnimationConfig,
  type AnimationDraftReceipt,
  type AnimationEditorAdapter,
  type AnimationEditorTarget,
} from "./components/animation-editor";

const drafts = new Map<string, AnimationConfig>();

const adapter: AnimationEditorAdapter = {
  getDraftConfig(target, scope) {
    return drafts.get(JSON.stringify(scope)) ?? {};
  },
  getPublishedConfig() {
    return {};
  },
  getAvailableScopes(target) {
    return [
      {
        scope: { kind: "target", targetId: target.id },
        label: `Only this ${target.type}`,
        description: "Change only the selected item.",
      },
    ];
  },
  preview() {},
  clearPreview() {},
  replay() {},
  cancel() {},
  async saveDraft(input) {
    const key = JSON.stringify(input.scope);
    const previousValue = drafts.get(key);
    drafts.set(key, structuredClone(input.config));
    return {
      id: crypto.randomUUID(),
      label: input.label,
      changes: [
        {
          document: "page",
          path: [key],
          previousValue,
          nextValue: input.config,
        },
      ],
    } satisfies AnimationDraftReceipt;
  },
  async undo(receipt) {
    const change = receipt.changes[0];
    if (!change) return;
    const key = String(change.path[0]);
    if (change.previousValue && typeof change.previousValue === "object") {
      drafts.set(key, change.previousValue as AnimationConfig);
    } else {
      drafts.delete(key);
    }
  },
  async resetDraft(input) {
    drafts.delete(JSON.stringify(input.scope));
  },
  subscribeStatus() {
    return () => undefined;
  },
};

export function EditableApp({ children }: { children: React.ReactNode }) {
  return (
    <AnimationEditorProvider adapter={adapter} enabled>
      {children}
    </AnimationEditorProvider>
  );
}
```

## Register a target

Use `AnimationTargetOverlay` next to the rendered element, or create a host wrapper that lazy-loads it only in edit mode:

```tsx
import { useRef } from "react";
import { AnimationTargetOverlay } from "./components/animation-editor";

export function EditableButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const target: AnimationEditorTarget = {
    id: "component:hero:quote",
    type: "button",
    label: "Get a Quote button",
    pageId: "home",
    sectionId: "hero",
    element: ref.current,
  };

  return (
    <button ref={ref} data-animation-target={target.id}>
      Get a Quote
      <AnimationTargetOverlay target={target} />
    </button>
  );
}
```

The adapter controls how preview, replay, draft persistence, Undo, publishing integration, and page transitions work. The reusable editor never publishes automatically.

## Optional page transitions

Implement these optional adapter methods to show page-transition choices on page targets:

```ts
getPageTransitionConfig()
previewPageTransition(config)
clearPageTransitionPreview()
savePageTransition(config, label)
```

## Custom animation choices

Pass a custom `intents` array to `AnimationEditorProvider`. Each intent defines its plain-language title, supported target types, allowed triggers, and safe defaults.

## Required host behavior

- Render the overlay only during authenticated edit mode.
- Keep temporary preview state separate from persisted drafts.
- Keep Publish as a separate explicit action.
- Respect `prefers-reduced-motion` in the host playback adapter.
- Mark CMS controls with `data-cms-ui` when the host intercepts page navigation.
