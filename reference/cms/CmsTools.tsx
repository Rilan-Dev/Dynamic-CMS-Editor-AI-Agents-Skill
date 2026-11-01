"use client";

import { Toaster } from "@/components/ui/sonner";
import { GlobalEditToolbar } from "./GlobalEditToolbar";
import { ClickBlocker } from "./ClickBlocker";

/**
 * Editor chrome loaded lazily for unlocked sessions: the edit-mode
 * dock + toasts + the global click/navigation blocker. Editing itself
 * happens directly on the page via the inline primitives
 * (components/cms/editable.tsx) — no side panel.
 */
export function CmsTools() {
  return (
    <>
      <ClickBlocker />
      <GlobalEditToolbar />
      <Toaster position="top-center" richColors />
    </>
  );
}
