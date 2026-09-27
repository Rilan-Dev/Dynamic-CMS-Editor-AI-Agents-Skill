"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ElementOverlay,
  type DesignToolMode,
  type SelectedDesignElement,
} from "@/components/element-overlay";
import { GlobalEditToolbar } from "./GlobalEditToolbar";
import { ClickBlocker } from "./ClickBlocker";

/**
 * Editor chrome loaded lazily for unlocked sessions: the edit-mode
 * dock + toasts + the global click/navigation blocker. Editing itself
 * happens directly on the page via the inline primitives
 * (components/cms/editable.tsx) — no side panel.
 *
 * Also mounts the cursor-driven ElementOverlay as an opt-in "Scan page"
 * mode: it hit-tests any element under the cursor, highlights it with a
 * smooth chasing outline, and serializes it on click. This is the
 * extension point for the planned AI skill that migrates static content
 * into CMS documents (el.cssPath → CMS JSON path mapping).
 */
export function CmsTools() {
  const [scanTool, setScanTool] = useState<DesignToolMode>("interact");

  const handleElementSelected = (el: SelectedDesignElement) => {
    // TODO(P4): AI migration hook — map el.cssPath / el.dataAttrs to a CMS JSON path.
    toast.info(`Selected: ${el.componentKey || el.tag}${el.id ? ` #${el.id}` : ""}`);
  };

  const handleTextEditSubmit = (original: string, next: string, el: SelectedDesignElement) => {
    // TODO(P4): map el.cssPath to a CMS JSON path and write via store.setPath.
    void original;
    void next;
    void el;
    toast.success("Edit captured (CMS path mapping pending)");
  };

  return (
    <>
      <ClickBlocker />
      <GlobalEditToolbar />
      <Toaster position="top-center" richColors />
      <ElementOverlay
        tool={scanTool}
        onToolChange={setScanTool}
        onElementSelected={handleElementSelected}
        onTextEditSubmit={handleTextEditSubmit}
        skipSelector="[data-overlay-ui], [data-cms-ui], [data-radix-popper-content-wrapper], [data-sonner-toaster], [role='dialog'], [role='alertdialog'], [contenteditable='true']"
        zIndex={45}
      />
      {scanTool === "interact" && (
        <button
          type="button"
          data-cms-ui
          onClick={() => setScanTool("select")}
          className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white/90 px-4 py-2 text-xs font-semibold text-neutral-800 shadow-lg backdrop-blur transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          ⌖ Scan page
        </button>
      )}
    </>
  );
}
