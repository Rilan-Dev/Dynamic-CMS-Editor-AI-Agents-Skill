"use client";

import { Pin, PinOff } from "lucide-react";
import { ERemove } from "@/components/cms/editable";
import type { JsonValue } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import type { UpdateEntry } from "./updatesModel";

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO timestamp → `datetime-local` value, in the editor's own time zone. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const chip =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

/**
 * Per-card editor chrome: publish state, pin, timestamp and remove. Only
 * mounted in edit mode (after hydration), so reading the editor's local
 * time zone here cannot cause a hydration mismatch.
 */
export function UpdateEditorControls({
  entry,
  entries,
}: {
  entry: UpdateEntry;
  /** The raw stored `entries` array, for removal. */
  entries: JsonValue[];
}) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return null;

  const published = entry.status === "published";

  return (
    <div
      data-cms-ui
      className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3"
    >
      <button
        type="button"
        onClick={() => setPath(["entries", entry.index, "status"], published ? "draft" : "published")}
        className={`${chip} ${
          published
            ? "bg-brand-soft text-brand-strong hover:bg-brand-soft-strong"
            : "bg-inverse text-inverse-foreground hover:opacity-90"
        }`}
      >
        {published ? "Published — click to unlist" : "Draft — click to list it"}
      </button>
      <button
        type="button"
        aria-pressed={entry.pinned}
        onClick={() => setPath(["entries", entry.index, "pinned"], !entry.pinned)}
        className={`${chip} bg-muted text-muted-foreground hover:bg-accent hover:text-foreground`}
      >
        {entry.pinned ? <PinOff size={13} aria-hidden="true" /> : <Pin size={13} aria-hidden="true" />}
        {entry.pinned ? "Unpin" : "Pin to top"}
      </button>
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        Posted
        <input
          type="datetime-local"
          value={toLocalInput(entry.postedAt)}
          onChange={(event) => {
            const next = new Date(event.currentTarget.value);
            if (!Number.isNaN(next.getTime())) {
              setPath(["entries", entry.index, "postedAt"], next.toISOString());
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-brand focus:outline-none"
        />
      </label>
      <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
        Remove
        <ERemove
          label="update"
          onRemove={() =>
            setPath(
              ["entries"],
              entries.filter((_, position) => position !== entry.index),
            )
          }
        />
      </span>
    </div>
  );
}
