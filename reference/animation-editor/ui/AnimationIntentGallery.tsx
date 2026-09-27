"use client";

import type { AnimationEditorTarget, AnimationIntentDefinition } from "../core/types";
import { AnimationIntentCard } from "./AnimationIntentCard";

const groupLabels: Record<AnimationIntentDefinition["group"], string> = {
  entrance: "Come into view",
  attention: "Draw attention",
  interaction: "React to visitors",
  scroll: "Move while scrolling",
  none: "Keep still",
};

export function AnimationIntentGallery({
  target,
  intents,
  activeIntentId,
  onPreview,
  onClearPreview,
  onSelect,
}: {
  target: AnimationEditorTarget;
  intents: AnimationIntentDefinition[];
  activeIntentId: string;
  onPreview(intent: AnimationIntentDefinition): void;
  onClearPreview(): void;
  onSelect(intent: AnimationIntentDefinition): void;
}) {
  const supported = intents.filter((intent) =>
    intent.supportedTargetTypes.includes(target.type),
  );
  const groups = (["entrance", "attention", "interaction", "scroll", "none"] as const)
    .map((group) => ({ group, intents: supported.filter((intent) => intent.group === group) }))
    .filter((entry) => entry.intents.length > 0);

  return (
    <div className="ae-group">
      <p className="ae-question">How should this item move?</p>
      {groups.map((entry) => (
        <section key={entry.group} className="ae-group" aria-label={groupLabels[entry.group]}>
          <h4 className="ae-group-title">{groupLabels[entry.group]}</h4>
          <div className="ae-grid">
            {entry.intents.map((intent) => (
              <AnimationIntentCard
                key={intent.id}
                intent={intent}
                active={activeIntentId === intent.id}
                onPreview={onPreview}
                onClearPreview={onClearPreview}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
