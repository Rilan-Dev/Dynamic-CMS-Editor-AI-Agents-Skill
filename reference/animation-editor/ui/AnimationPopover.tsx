"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deriveIntentDefaults,
  mapIntentToConfig,
  recognizeIntent,
} from "../core/intent-mapper";
import type {
  AnimationApplyScope,
  AnimationConfig,
  AnimationDraftReceipt,
  AnimationDraftStatus,
  AnimationEditorTarget,
  AnimationIntentDefinition,
} from "../core/types";
import { calculatePopoverPosition } from "../runtime/popover-position";
import { useAnimationEditor } from "../runtime/AnimationEditorProvider";
import { usePopoverFocus } from "../runtime/usePopoverFocus";
import { AnimationDraftStatus as DraftStatus } from "./AnimationDraftStatus";
import { AnimationFineTune } from "./AnimationFineTune";
import { AnimationIntentGallery } from "./AnimationIntentGallery";
import {
  AnimationSimpleControls,
  type AnimationSimpleValue,
} from "./AnimationSimpleControls";
import { AnimationScopePicker } from "./AnimationScopePicker";
import { PageTransitionEditor } from "./PageTransitionEditor";

const sameScope = (left: AnimationApplyScope, right: AnimationApplyScope): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export function AnimationPopover({
  target,
  anchor,
  onClose,
}: {
  target: AnimationEditorTarget;
  anchor: HTMLElement;
  onClose(): void;
}) {
  const { adapter, intents, previewStore, slots } = useAnimationEditor();
  const rootRef = useRef<HTMLDivElement>(null);
  usePopoverFocus(rootRef, onClose);
  const scopeOptions = useMemo(
    () => adapter.getAvailableScopes(target),
    [adapter, target],
  );
  const initialScope =
    scopeOptions[0]?.scope ?? ({ kind: "target", targetId: target.id } as const);
  const [scope, setScope] = useState<AnimationApplyScope>(initialScope);
  const [config, setConfig] = useState<AnimationConfig>(() =>
    adapter.getDraftConfig(target, initialScope),
  );
  const recognition = recognizeIntent(config);
  const initialIntent = intents.find((intent) => intent.id === recognition.intentId);
  const initialSimple: AnimationSimpleValue = initialIntent
    ? deriveIntentDefaults(config, initialIntent.defaults)
    : {
        strength: "gentle",
        speed: "normal",
        delay: "none",
        trigger: "in-view",
        repetition: "once",
      };
  const [intentId, setIntentId] = useState(recognition.intentId);
  const [simple, setSimple] = useState<AnimationSimpleValue>(initialSimple);
  const [status, setStatus] = useState<AnimationDraftStatus>("idle");
  const [receipt, setReceipt] = useState<AnimationDraftReceipt | null>(null);
  const [position, setPosition] = useState({ top: 12, left: 12 });

  const activeIntent = intents.find((intent) => intent.id === intentId);

  useEffect(() => adapter.subscribeStatus(setStatus), [adapter]);

  useEffect(() => {
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const popover = rootRef.current?.getBoundingClientRect();
      const next = calculatePopoverPosition(
        rect,
        { width: window.innerWidth, height: window.innerHeight },
        { width: popover?.width || 390, height: popover?.height || 620 },
      );
      setPosition({ top: next.top, left: next.left });
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [anchor]);

  const configFor = (
    intent: AnimationIntentDefinition,
    value: AnimationSimpleValue,
  ): AnimationConfig =>
    mapIntentToConfig({
      intentId: intent.id,
      strength: value.strength,
      speed: value.speed,
      delay: value.delay,
      repetition: value.repetition,
      trigger: value.trigger,
      stagger: value.stagger,
    });

  const syncControlsFromConfig = (nextConfig: AnimationConfig) => {
    const nextRecognition = recognizeIntent(nextConfig);
    setIntentId(nextRecognition.intentId);
    const nextIntent = intents.find((intent) => intent.id === nextRecognition.intentId);
    if (nextIntent) {
      setSimple(deriveIntentDefaults(nextConfig, nextIntent.defaults));
    }
  };

  const preview = (intent: AnimationIntentDefinition) => {
    const nextValue: AnimationSimpleValue = {
      strength: intent.defaults.strength,
      speed: intent.defaults.speed,
      delay: intent.defaults.delay,
      trigger: intent.defaults.trigger,
      repetition: intent.defaults.repetition,
      stagger: intent.defaults.stagger,
    };
    const previewConfig = configFor(intent, nextValue);
    previewStore.set(target.id, previewConfig);
    setStatus("previewing");
    adapter.preview(target, previewConfig);
  };

  const clearPreview = () => {
    previewStore.clear(target.id);
    adapter.clearPreview(target);
    setStatus((current) => (current === "saved" ? "saved" : "idle"));
  };

  const saveConfig = async (
    nextConfig: AnimationConfig,
    label: string,
    destinationScope: AnimationApplyScope = scope,
  ): Promise<void> => {
    previewStore.clear(target.id);
    setStatus("unsaved");
    try {
      const nextReceipt = await adapter.saveDraft({
        target,
        scope: destinationScope,
        config: nextConfig,
        label,
      });
      setConfig(nextConfig);
      setReceipt(nextReceipt);
      setStatus("saved");
      adapter.replay(target);
      slots.renderToast?.("Saved to draft", "success");
    } catch (error) {
      setStatus("error");
      slots.renderToast?.((error as Error).message || "Draft save failed", "error");
    }
  };

  const selectIntent = (intent: AnimationIntentDefinition) => {
    const nextSimple: AnimationSimpleValue = {
      strength: intent.defaults.strength,
      speed: intent.defaults.speed,
      delay: intent.defaults.delay,
      trigger: intent.defaults.trigger,
      repetition: intent.defaults.repetition,
      stagger: intent.defaults.stagger,
    };
    const nextConfig = configFor(intent, nextSimple);
    setIntentId(intent.id);
    setSimple(nextSimple);
    void saveConfig(nextConfig, intent.title);
  };

  const changeSimple = (next: AnimationSimpleValue) => {
    setSimple(next);
    if (!activeIntent) return;
    void saveConfig(configFor(activeIntent, next), `Adjust ${activeIntent.title}`);
  };

  const changeScope = (nextScope: AnimationApplyScope) => {
    if (sameScope(scope, nextScope)) return;
    setScope(nextScope);
    setReceipt(null);

    const hasExplicitAnimation =
      Object.keys(config).length > 0 && config.mode !== "inherit";
    if (hasExplicitAnimation) {
      void saveConfig(config, "Apply animation to selected scope", nextScope);
      return;
    }

    const destinationConfig = adapter.getDraftConfig(target, nextScope);
    setConfig(destinationConfig);
    syncControlsFromConfig(destinationConfig);
  };

  const undo = async () => {
    if (!receipt) return;
    setStatus("saving");
    try {
      await adapter.undo(receipt);
      setReceipt(null);
      setStatus("saved");
      const restored = adapter.getDraftConfig(target, scope);
      setConfig(restored);
      syncControlsFromConfig(restored);
      adapter.replay(target);
    } catch {
      setStatus("error");
    }
  };

  const fineTune = (nextConfig: AnimationConfig) => {
    setConfig(nextConfig);
    void saveConfig(nextConfig, "Fine tune animation");
  };

  const subtitle =
    intentId === "custom"
      ? "Custom animation"
      : intentId === "inherited"
        ? "Using the page or website animation"
        : "Changes save only to the draft";

  return (
    <div
      ref={rootRef}
      className="ae-root"
      style={{ top: position.top, left: position.left }}
      data-cms-ui
      role="dialog"
      aria-modal="false"
      aria-label={`Animate ${target.label}`}
      tabIndex={-1}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="ae-header">
        <div>
          <h3 className="ae-title">✨ Animate: {target.label}</h3>
          <p className="ae-subtitle">{subtitle}</p>
        </div>
        <button
          type="button"
          className="ae-close"
          aria-label="Close"
          data-ae-initial-focus
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="ae-body">
        <DraftStatus status={status} receipt={receipt} onUndo={() => void undo()} />
        <AnimationIntentGallery
          target={target}
          intents={intents}
          activeIntentId={intentId}
          onPreview={preview}
          onClearPreview={clearPreview}
          onSelect={selectIntent}
        />

        {activeIntent && activeIntent.id !== "none" && (
          <AnimationSimpleControls
            value={simple}
            allowedTriggers={activeIntent.allowedTriggers}
            allowContinuous={["gentle-pulse", "float-softly"].includes(activeIntent.id)}
            showStagger={["page", "section", "listItem"].includes(target.type)}
            onChange={changeSimple}
          />
        )}

        <AnimationScopePicker
          options={scopeOptions}
          value={scope}
          onChange={changeScope}
        />

        {activeIntent && activeIntent.id !== "none" && (
          <AnimationFineTune
            value={config}
            onChange={fineTune}
            onReset={() => void saveConfig(configFor(activeIntent, simple), "Reset fine tuning")}
          />
        )}

        {target.type === "page" && <PageTransitionEditor />}

        <small style={{ color: "var(--ae-muted)" }}>
          Public visitors keep seeing the published version until you press Publish.
        </small>
      </div>
    </div>
  );
}
