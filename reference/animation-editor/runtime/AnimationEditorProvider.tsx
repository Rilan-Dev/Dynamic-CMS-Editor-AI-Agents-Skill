"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEFAULT_ANIMATION_INTENTS } from "../core/intents";
import {
  createPreviewStore,
  type AnimationPreviewStore,
} from "../core/preview-state";
import type {
  AnimationConfig,
  AnimationEditorAdapter,
  AnimationEditorSlots,
  AnimationIntentDefinition,
} from "../core/types";
import {
  createActivePopoverCoordinator,
  type ActivePopoverCoordinator,
} from "./active-popover";

interface AnimationEditorContextValue {
  enabled: boolean;
  adapter: AnimationEditorAdapter;
  intents: AnimationIntentDefinition[];
  slots: AnimationEditorSlots;
  previewStore: AnimationPreviewStore;
  coordinator: ActivePopoverCoordinator;
}

const AnimationEditorContext = createContext<AnimationEditorContextValue | null>(null);
const PreviewStoreContext = createContext<AnimationPreviewStore | null>(null);

export function AnimationEditorProvider({
  enabled = true,
  adapter,
  intents = DEFAULT_ANIMATION_INTENTS,
  slots = {},
  coordinator,
  children,
}: {
  enabled?: boolean;
  adapter: AnimationEditorAdapter;
  intents?: AnimationIntentDefinition[];
  slots?: AnimationEditorSlots;
  coordinator?: ActivePopoverCoordinator;
  children: ReactNode;
}) {
  const previewStoreRef = useRef<AnimationPreviewStore | null>(null);
  const coordinatorRef = useRef<ActivePopoverCoordinator | null>(null);
  if (!previewStoreRef.current) previewStoreRef.current = createPreviewStore();
  if (!coordinatorRef.current) {
    coordinatorRef.current = coordinator ?? createActivePopoverCoordinator();
  }

  const value = useMemo<AnimationEditorContextValue>(
    () => ({
      enabled,
      adapter,
      intents,
      slots,
      previewStore: previewStoreRef.current!,
      coordinator: coordinator ?? coordinatorRef.current!,
    }),
    [adapter, coordinator, enabled, intents, slots],
  );

  return (
    <AnimationEditorContext.Provider value={value}>
      <PreviewStoreContext.Provider value={value.previewStore}>
        {children}
      </PreviewStoreContext.Provider>
    </AnimationEditorContext.Provider>
  );
}

export function useAnimationEditor(): AnimationEditorContextValue {
  const value = useContext(AnimationEditorContext);
  if (!value) {
    throw new Error("useAnimationEditor must be used inside AnimationEditorProvider");
  }
  return value;
}

export function useOptionalAnimationEditor(): AnimationEditorContextValue | null {
  return useContext(AnimationEditorContext);
}

export function useAnimationPreviewConfig(targetId?: string): AnimationConfig | undefined {
  const store = useContext(PreviewStoreContext);
  return useSyncExternalStore(
    (listener) => (store ? store.subscribe(listener) : () => undefined),
    () => (store && targetId ? store.get(targetId) : undefined),
    () => undefined,
  );
}
