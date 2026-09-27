import type { AnimationConfig } from "./types";

export interface AnimationPreviewStore {
  set(targetId: string, config: AnimationConfig): void;
  clear(targetId: string): void;
  clearAll(): void;
  get(targetId: string): AnimationConfig | undefined;
  resolve(targetId: string, draft: AnimationConfig): AnimationConfig;
  subscribe(listener: () => void): () => void;
}

export function createPreviewStore(): AnimationPreviewStore {
  const values = new Map<string, AnimationConfig>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    set(targetId, config) {
      values.set(targetId, structuredClone(config));
      emit();
    },
    clear(targetId) {
      if (values.delete(targetId)) emit();
    },
    clearAll() {
      if (!values.size) return;
      values.clear();
      emit();
    },
    get: (targetId) => values.get(targetId),
    resolve: (targetId, draft) => values.get(targetId) ?? draft,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
