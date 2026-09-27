"use client";

import type {
  AnimationDelayChoice,
  AnimationRepetition,
  AnimationSpeed,
  AnimationStaggerChoice,
  AnimationStrength,
  AnimationTrigger,
} from "../core/types";

export interface AnimationSimpleValue {
  strength: AnimationStrength;
  speed: AnimationSpeed;
  delay: AnimationDelayChoice;
  trigger: AnimationTrigger;
  repetition: AnimationRepetition;
  stagger?: AnimationStaggerChoice;
}

const labels: Record<string, string> = {
  gentle: "Gentle",
  balanced: "Balanced",
  bold: "Bold",
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
  none: "None",
  slight: "Slight",
  noticeable: "Noticeable",
  once: "Play once",
  "on-reentry": "Play again",
  continuous: "Keep moving",
  together: "Together",
  sequence: "One after another",
  relaxed: "Relaxed sequence",
  "in-view": "When visible",
  "page-load": "When page opens",
  "page-enter": "When page opens",
  hover: "On hover",
  click: "When clicked",
  focus: "When focused",
  "scroll-progress": "While scrolling",
};

function Segments<T extends string>({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: readonly T[];
  value: T;
  onChange(value: T): void;
}) {
  return (
    <div className="ae-control">
      <span className="ae-label">{label}</span>
      <div className="ae-segments" role="group" aria-label={label}>
        {values.map((option) => (
          <button
            key={option}
            type="button"
            className="ae-segment"
            data-active={option === value}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {labels[option] ?? option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnimationSimpleControls({
  value,
  allowedTriggers,
  allowContinuous,
  showStagger = false,
  onChange,
}: {
  value: AnimationSimpleValue;
  allowedTriggers: AnimationTrigger[];
  allowContinuous: boolean;
  showStagger?: boolean;
  onChange(value: AnimationSimpleValue): void;
}) {
  const repetition: readonly AnimationRepetition[] = allowContinuous
    ? ["once", "on-reentry", "continuous"]
    : ["once", "on-reentry"];
  const displayedRepetition: AnimationRepetition =
    !allowContinuous && value.repetition === "continuous"
      ? "once"
      : value.repetition;

  return (
    <div className="ae-controls">
      <Segments
        label="Strength"
        values={["gentle", "balanced", "bold"] as const}
        value={value.strength}
        onChange={(strength) => onChange({ ...value, strength })}
      />
      <Segments
        label="Speed"
        values={["slow", "normal", "fast"] as const}
        value={value.speed}
        onChange={(speed) => onChange({ ...value, speed })}
      />
      <Segments
        label="Delay"
        values={["none", "slight", "noticeable"] as const}
        value={value.delay}
        onChange={(delay) => onChange({ ...value, delay })}
      />
      {allowedTriggers.length > 1 && (
        <Segments
          label="When it plays"
          values={allowedTriggers}
          value={allowedTriggers.includes(value.trigger) ? value.trigger : allowedTriggers[0]!}
          onChange={(trigger) => onChange({ ...value, trigger })}
        />
      )}
      <Segments
        label="Playback"
        values={repetition}
        value={displayedRepetition}
        onChange={(next) => onChange({ ...value, repetition: next })}
      />
      {showStagger && (
        <Segments
          label="Items appear"
          values={["together", "sequence", "relaxed"] as const}
          value={value.stagger ?? "together"}
          onChange={(stagger) => onChange({ ...value, stagger })}
        />
      )}
    </div>
  );
}
