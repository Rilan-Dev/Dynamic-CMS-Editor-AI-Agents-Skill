"use client";

import type { AnimationIntentDefinition } from "../core/types";

const glyphByGroup: Record<AnimationIntentDefinition["group"], string> = {
  entrance: "↗",
  attention: "✦",
  interaction: "⌁",
  scroll: "↕",
  none: "—",
};

export function AnimationIntentCard({
  intent,
  active,
  onPreview,
  onClearPreview,
  onSelect,
}: {
  intent: AnimationIntentDefinition;
  active: boolean;
  onPreview(intent: AnimationIntentDefinition): void;
  onClearPreview(): void;
  onSelect(intent: AnimationIntentDefinition): void;
}) {
  return (
    <button
      type="button"
      className="ae-intent-card"
      data-active={active}
      aria-label={intent.title}
      aria-pressed={active}
      onPointerEnter={() => onPreview(intent)}
      onPointerLeave={onClearPreview}
      onFocus={() => onPreview(intent)}
      onBlur={onClearPreview}
      onClick={() => onSelect(intent)}
    >
      <span aria-hidden className="ae-sample">
        {intent.previewGlyph ?? glyphByGroup[intent.group]}
      </span>
      <span>
        <strong>{intent.title}</strong>
        <small>{intent.description}</small>
      </span>
    </button>
  );
}
