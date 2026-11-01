"use client";

import { setPath, useCmsEditing } from "@/components/cms/store";

/**
 * A post carries its own status, separate from the document's draft/publish
 * state: publishing the document alone would leave the article invisible.
 * This is the control that decides whether visitors ever see it.
 */
export function PostStatusControl({ status }: { status: string }) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return null;

  const published = status === "published";

  return (
    <span data-cms-ui className="inline-flex items-center gap-2">
      <button
        type="button"
        data-cms-ui
        onClick={() => setPath(["status"], published ? "draft" : "published")}
        className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
          published
            ? "bg-brand-soft text-brand-strong hover:bg-brand-soft-strong"
            : "bg-amber-100 text-amber-900 hover:bg-amber-200"
        }`}
      >
        {published ? "Published — click to unlist" : "Draft — click to list it"}
      </button>
      <span className="text-xs text-inverse-foreground/70">
        then Publish in the toolbar to save it
      </span>
    </span>
  );
}
