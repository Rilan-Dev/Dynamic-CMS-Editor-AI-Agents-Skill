"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AnimationEditorTarget } from "../core/types";
import { AnimationPopover } from "../ui/AnimationPopover";
import { useOptionalAnimationEditor } from "./AnimationEditorProvider";

const resolveElement = (target: AnimationEditorTarget): HTMLElement | null => {
  if (target.element?.isConnected) return target.element;
  if (typeof document === "undefined") return null;
  const escaped = target.id.replaceAll('"', '\\"');
  return document.querySelector<HTMLElement>(`[data-animation-target="${escaped}"]`);
};

const closeExistingCmsPopovers = () => {
  document
    .querySelectorAll<HTMLElement>(
      '.cms-img-bar .cms-bar-x, .cms-icon-trigger[data-state="open"]',
    )
    .forEach((control) => control.click());
};

export function AnimationTargetOverlay({
  target,
}: {
  target: AnimationEditorTarget;
}) {
  const editor = useOptionalAnimationEditor();
  const stableTarget = useMemo<AnimationEditorTarget>(
    () => ({
      id: target.id,
      type: target.type,
      label: target.label,
      pageId: target.pageId,
      sectionId: target.sectionId,
      element: target.element,
    }),
    [
      target.element,
      target.id,
      target.label,
      target.pageId,
      target.sectionId,
      target.type,
    ],
  );
  const badgeRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [badgePosition, setBadgePosition] = useState({ top: 12, left: 12 });

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      if (!open) setVisible(false);
    }, 140);
  }, [cancelHide, open]);

  const updatePosition = useCallback(() => {
    const current = element ?? resolveElement(stableTarget);
    if (!current) return;
    const rect = current.getBoundingClientRect();
    const avoidExistingBadge = stableTarget.type === "image" || stableTarget.type === "icon";
    const preferredLeft = avoidExistingBadge ? rect.left + 8 : rect.right - 38;
    setBadgePosition({
      top: Math.max(8, Math.min(window.innerHeight - 42, rect.top + 8)),
      left: Math.max(8, Math.min(window.innerWidth - 42, preferredLeft)),
    });
  }, [element, stableTarget]);

  const close = useCallback(() => {
    if (!editor) return;
    const activeTarget = { ...stableTarget, element };
    editor.previewStore.clear(stableTarget.id);
    editor.adapter.clearPreview(activeTarget);
    setOpen(false);
    setVisible(false);
    editor.coordinator.close(`animation:${stableTarget.id}`);
    window.setTimeout(() => badgeRef.current?.focus(), 0);
  }, [editor, element, stableTarget]);

  useEffect(() => {
    if (!editor?.enabled) return;
    let cancelled = false;
    const resolve = () => {
      const next = resolveElement(stableTarget);
      if (!cancelled && next) setElement(next);
    };
    resolve();
    const frame = window.requestAnimationFrame(resolve);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [editor?.enabled, stableTarget]);

  useEffect(() => {
    if (element) updatePosition();
  }, [element, updatePosition]);

  useEffect(() => {
    if (!editor?.enabled || !element) return;

    const onPointerOver = (event: PointerEvent) => {
      const source = event.target;
      const nearest =
        source instanceof Element
          ? source.closest("[data-animation-target]")
          : null;
      if (nearest !== element) return;
      cancelHide();
      setVisible(true);
      updatePosition();
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      scheduleHide();
    };
    const onFocusIn = () => {
      cancelHide();
      setVisible(true);
      updatePosition();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      scheduleHide();
    };

    element.addEventListener("pointerover", onPointerOver);
    element.addEventListener("pointerout", onPointerOut);
    element.addEventListener("focusin", onFocusIn);
    element.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      element.removeEventListener("pointerover", onPointerOver);
      element.removeEventListener("pointerout", onPointerOut);
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [cancelHide, editor?.enabled, element, scheduleHide, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const closeForOtherCmsEditor = (event: PointerEvent) => {
      const clicked = event.target;
      if (
        clicked instanceof Element &&
        clicked.closest(".cms-img-badge, .cms-icon-trigger")
      ) {
        close();
      }
    };
    document.addEventListener("pointerdown", closeForOtherCmsEditor, true);
    return () => {
      document.removeEventListener("pointerdown", closeForOtherCmsEditor, true);
    };
  }, [close, open]);

  useEffect(() => {
    if (!element) return;
    element.classList.toggle("ae-target-outline", visible || open);
    return () => element.classList.remove("ae-target-outline");
  }, [element, open, visible]);

  useEffect(
    () => () => {
      cancelHide();
      if (editor) {
        editor.previewStore.clear(stableTarget.id);
        editor.adapter.cancel({ ...stableTarget, element });
        editor.coordinator.close(`animation:${stableTarget.id}`);
      }
    },
    [cancelHide, editor, element, stableTarget],
  );

  if (!editor?.enabled || !element || typeof document === "undefined") return null;

  const portalRoot = editor.slots.portalRoot ?? document.body;
  const openEditor = () => {
    cancelHide();
    closeExistingCmsPopovers();
    updatePosition();
    editor.coordinator.open(`animation:${stableTarget.id}`, close);
    setVisible(true);
    setOpen(true);
  };

  return createPortal(
    <>
      <button
        ref={badgeRef}
        type="button"
        className="ae-badge"
        data-visible={visible || open}
        style={{ top: badgePosition.top, left: badgePosition.left }}
        aria-label={`Animate ${stableTarget.label}`}
        title={`Animate ${stableTarget.label}`}
        data-cms-ui
        onFocus={() => {
          cancelHide();
          setVisible(true);
          updatePosition();
        }}
        onBlur={scheduleHide}
        onPointerEnter={cancelHide}
        onPointerLeave={scheduleHide}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (open) close();
          else openEditor();
        }}
      >
        {editor.slots.renderIcon?.("sparkles") ?? "✨"}
      </button>
      {open && badgeRef.current && (
        <AnimationPopover
          target={{ ...stableTarget, element }}
          anchor={badgeRef.current}
          onClose={close}
        />
      )}
    </>,
    portalRoot,
  );
}
