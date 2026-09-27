"use client";

import type { AnimationDraftStatus, AnimationDraftReceipt } from "../core/types";

const statusText: Record<AnimationDraftStatus, string> = {
  idle: "Draft ready",
  previewing: "Previewing — not saved",
  unsaved: "Saving change…",
  saving: "Saving draft…",
  saved: "Saved to draft",
  "saved-local-only": "Saved locally — server sync failed",
  error: "Draft save failed",
};

export function AnimationDraftStatus({
  status,
  receipt,
  onUndo,
}: {
  status: AnimationDraftStatus;
  receipt: AnimationDraftReceipt | null;
  onUndo(): void;
}) {
  const tone = status === "saved" ? "success" : status === "error" || status === "saved-local-only" ? "error" : "neutral";
  return (
    <div className="ae-status" data-tone={tone} aria-live="polite">
      <span>{statusText[status]}</span>
      {receipt && (
        <button type="button" className="ae-button" onClick={onUndo}>
          Undo
        </button>
      )}
    </div>
  );
}
