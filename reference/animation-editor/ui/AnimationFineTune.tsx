"use client";

import type { AnimationConfig } from "../core/types";

const namedEasing = [
  ["ease-out", "Smooth finish"],
  ["ease-in-out", "Smooth start and finish"],
  ["linear", "Even speed"],
] as const;

export function AnimationFineTune({
  value,
  onChange,
  onReset,
}: {
  value: AnimationConfig;
  onChange(value: AnimationConfig): void;
  onReset(): void;
}) {
  const timing = value.timing ?? {};
  const devices = value.devices ?? {};
  const updateTiming = (key: string, next: string | number) =>
    onChange({ ...value, timing: { ...timing, [key]: next } });

  return (
    <details className="ae-disclosure">
      <summary>Fine tune</summary>
      <div className="ae-fine-grid">
        <label>
          Exact speed
          <input
            type="number"
            min={100}
            max={30000}
            step={50}
            value={timing.durationMs ?? 600}
            onChange={(event) =>
              updateTiming("durationMs", Math.max(100, Number(event.target.value) || 600))
            }
          />
        </label>
        <label>
          Exact delay
          <input
            type="number"
            min={0}
            max={30000}
            step={50}
            value={timing.delayMs ?? 0}
            onChange={(event) =>
              updateTiming("delayMs", Math.max(0, Number(event.target.value) || 0))
            }
          />
        </label>
        <label>
          Movement feel
          <select
            value={
              namedEasing.some(([namedValue]) => namedValue === timing.easing)
                ? timing.easing
                : "ease-out"
            }
            onChange={(event) => updateTiming("easing", event.target.value)}
          >
            {namedEasing.map(([namedValue, label]) => (
              <option key={namedValue} value={namedValue}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reduced motion
          <select
            value={devices.reducedMotion ?? "disable"}
            onChange={(event) =>
              onChange({
                ...value,
                devices: {
                  ...devices,
                  reducedMotion: event.target.value as "disable" | "fade" | "instant",
                },
              })
            }
          >
            <option value="disable">Keep still</option>
            <option value="fade">Use a short fade</option>
            <option value="instant">Show instantly</option>
          </select>
        </label>
      </div>
      <div className="ae-actions" style={{ marginTop: 10 }}>
        <button type="button" className="ae-button" onClick={onReset}>
          Reset fine tuning
        </button>
      </div>
    </details>
  );
}
