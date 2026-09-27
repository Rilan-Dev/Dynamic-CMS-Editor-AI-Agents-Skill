"use client";

import { useEffect, useState } from "react";
import {
  PAGE_TRANSITION_INTENTS,
  normalizePageTransitionConfig,
  pageTransitionConfig,
  pageTransitionSpeed,
} from "../core/page-transitions";
import type {
  AnimationDraftReceipt,
  AnimationSpeed,
  PageTransitionIntentId,
} from "../core/types";
import { useAnimationEditor } from "../runtime/AnimationEditorProvider";

const speedLabel: Record<AnimationSpeed, string> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
};

export function PageTransitionEditor() {
  const { adapter, slots } = useAnimationEditor();
  const available =
    adapter.getPageTransitionConfig &&
    adapter.previewPageTransition &&
    adapter.clearPageTransitionPreview &&
    adapter.savePageTransition;
  const [config, setConfig] = useState(() =>
    normalizePageTransitionConfig(adapter.getPageTransitionConfig?.()),
  );
  const [speed, setSpeed] = useState<AnimationSpeed>(() =>
    pageTransitionSpeed(adapter.getPageTransitionConfig?.() ?? {}),
  );
  const [receipt, setReceipt] = useState<AnimationDraftReceipt | null>(null);
  const [status, setStatus] = useState<"idle" | "previewing" | "saving" | "saved" | "error">("idle");

  useEffect(
    () => () => adapter.clearPageTransitionPreview?.(),
    [adapter],
  );

  if (!available) return null;

  const preview = (intentId: PageTransitionIntentId) => {
    const next = pageTransitionConfig(intentId, speed, config);
    setStatus("previewing");
    adapter.previewPageTransition?.(next);
  };

  const clearPreview = () => {
    adapter.clearPageTransitionPreview?.();
    setStatus((current) => (current === "saved" ? "saved" : "idle"));
  };

  const save = async (
    next: ReturnType<typeof pageTransitionConfig>,
    label: string,
  ) => {
    adapter.clearPageTransitionPreview?.();
    setStatus("saving");
    try {
      const nextReceipt = await adapter.savePageTransition?.(next, label);
      setConfig(next);
      setReceipt(nextReceipt ?? null);
      setStatus("saved");
      adapter.previewPageTransition?.(next);
      slots.renderToast?.("Page transition saved to draft", "success");
    } catch (error) {
      setStatus("error");
      slots.renderToast?.((error as Error).message || "Unable to save transition", "error");
    }
  };

  const selectIntent = (intentId: PageTransitionIntentId) => {
    void save(
      pageTransitionConfig(intentId, speed, config),
      intentId === "none" ? "Remove page transition" : "Change page transition",
    );
  };

  const changeSpeed = (nextSpeed: AnimationSpeed) => {
    setSpeed(nextSpeed);
    if (!config.enabled) return;
    void save(
      pageTransitionConfig(config.preset, nextSpeed, config),
      "Adjust page transition speed",
    );
  };

  const undo = async () => {
    if (!receipt) return;
    setStatus("saving");
    try {
      await adapter.undo(receipt);
      const restored = normalizePageTransitionConfig(adapter.getPageTransitionConfig?.());
      setConfig(restored);
      setSpeed(pageTransitionSpeed(restored));
      setReceipt(null);
      setStatus("saved");
      adapter.previewPageTransition?.(restored);
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="ae-group ae-disclosure" aria-label="Page transitions">
      <div>
        <p className="ae-question">How should pages change?</p>
        <p className="ae-subtitle">
          Preview how visitors move from one page to another.
        </p>
      </div>

      <div className="ae-grid">
        {PAGE_TRANSITION_INTENTS.map((intent) => {
          const active = intent.id === "none"
            ? !config.enabled
            : config.enabled && config.preset === intent.id;
          return (
            <button
              key={intent.id}
              type="button"
              className="ae-intent-card"
              data-active={active}
              aria-pressed={active}
              onPointerEnter={() => preview(intent.id)}
              onPointerLeave={clearPreview}
              onFocus={() => preview(intent.id)}
              onBlur={clearPreview}
              onClick={() => selectIntent(intent.id)}
            >
              <span className="ae-sample" aria-hidden>{intent.glyph}</span>
              <span>
                <strong>{intent.title}</strong>
                <small>{intent.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      {config.enabled && (
        <div className="ae-control">
          <span className="ae-label">Transition speed</span>
          <div className="ae-segments" role="group" aria-label="Transition speed">
            {(["slow", "normal", "fast"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="ae-segment"
                data-active={speed === option}
                aria-pressed={speed === option}
                onClick={() => changeSpeed(option)}
              >
                {speedLabel[option]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ae-status" data-tone={status === "saved" ? "success" : status === "error" ? "error" : "neutral"} aria-live="polite">
        <span>
          {status === "previewing"
            ? "Previewing — not saved"
            : status === "saving"
              ? "Saving transition…"
              : status === "saved"
                ? "Saved to shared draft"
                : status === "error"
                  ? "Transition save failed"
                  : "Public pages change only after Publish"}
        </span>
        {receipt && (
          <button type="button" className="ae-button" onClick={() => void undo()}>
            Undo
          </button>
        )}
      </div>
    </section>
  );
}
