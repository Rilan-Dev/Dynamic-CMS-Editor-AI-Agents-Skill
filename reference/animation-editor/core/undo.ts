import type { AnimationDraftReceipt, AnimationPathChange } from "./types";

const createId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `animation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createUndoReceipt(
  label: string,
  changes: AnimationPathChange[],
): AnimationDraftReceipt {
  return {
    id: createId(),
    label,
    changes: structuredClone(changes),
  };
}

export function getUndoChanges(receipt: AnimationDraftReceipt): AnimationPathChange[] {
  return receipt.changes.map((change) => ({
    ...change,
    previousValue: structuredClone(change.previousValue),
    nextValue: structuredClone(change.nextValue),
  }));
}
