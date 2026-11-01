"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject, JsonValue } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { newUpdateEntry } from "@/content/updateDefaults";
import type { UpdateType } from "./updatesModel";

/**
 * Editor-only "post an update" bar at the top of the feed. It prepends a
 * draft timestamped now; the editor then fills in the body/image on the
 * card, flips it to published, and publishes the document.
 */
export function UpdateComposer({
  entries,
  types,
  placeholder,
  buttonLabel,
}: {
  /** The raw stored `entries` array. */
  entries: JsonValue[];
  types: UpdateType[];
  placeholder: string;
  buttonLabel: string;
}) {
  const { editing, ready } = useCmsEditing();
  const [headline, setHeadline] = useState("");
  const [choice, setChoice] = useState("");
  if (!editing || !ready) return null;

  const type = choice || types[0]?.slug || "";

  const post = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!headline.trim()) return;
    const entry: JsonObject = {
      ...newUpdateEntry(createCmsItemId("update"), new Date(), type),
      headline: headline.trim(),
    };
    setPath(["entries"], [entry, ...entries]);
    setHeadline("");
  };

  return (
    <form
      data-cms-ui
      onSubmit={post}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-brand/50 bg-brand-soft/60 p-4 sm:flex-row sm:items-center"
    >
      <label className="sr-only" htmlFor="update-composer-headline">
        {placeholder}
      </label>
      <input
        id="update-composer-headline"
        value={headline}
        onChange={(event) => setHeadline(event.currentTarget.value)}
        placeholder={placeholder}
        maxLength={200}
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
      />
      <label className="sr-only" htmlFor="update-composer-type">
        Update type
      </label>
      <select
        id="update-composer-type"
        value={type}
        onChange={(event) => setChoice(event.currentTarget.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
      >
        {types.map((option) => (
          <option key={option.id} value={option.slug}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!headline.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast transition-colors hover:bg-brand-strong disabled:opacity-40"
      >
        <Send size={15} aria-hidden="true" />
        {buttonLabel}
      </button>
    </form>
  );
}
