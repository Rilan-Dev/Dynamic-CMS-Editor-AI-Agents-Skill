"use client";

import { useEffect } from "react";
import { useCmsEditing } from "./store";

/**
 * While edit mode is on, block every normal interaction on the page —
 * route navigation, buttons, dialog triggers, form submits — at the
 * capture phase, so nothing fires by accident while editors click
 * around to edit labels. Only CMS controls (anything inside
 * [data-cms-ui]) and contentEditable text keep working.
 */
export function ClickBlocker() {
  const { editing, ready } = useCmsEditing();

  useEffect(() => {
    if (!editing || !ready) return;

    const allowed = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return true;
      // CMS chrome: dock, pickers, image bars, add/remove, portalled popovers
      if (target.closest("[data-cms-ui], [data-radix-popper-content-wrapper], [data-sonner-toaster], [role='dialog'], [role='alertdialog']")) {
        return true;
      }
      // editing text itself
      if (target.closest("[contenteditable='true']")) return true;
      return false;
    };

    // capture phase: swallow disallowed interactions before any handler.
    // CMS controls pass through untouched here — an early preventDefault
    // would make Radix triggers (which check event.defaultPrevented)
    // ignore the click.
    const onClickCapture = (e: MouseEvent) => {
      if (allowed(e.target)) return;
      const interactive = (e.target as Element).closest(
        "a, button, [role='button'], input, select, textarea, label, summary"
      );
      if (interactive) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // bubble phase (runs after React/Radix handlers): kill any remaining
    // anchor navigation — e.g. a picker button living inside a Link card.
    const onClickBubble = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("a")) e.preventDefault();
    };

    const onSubmit = (e: Event) => {
      if (!allowed(e.target)) e.preventDefault();
    };

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("click", onClickBubble, false);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("click", onClickBubble, false);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [editing, ready]);

  return null;
}
