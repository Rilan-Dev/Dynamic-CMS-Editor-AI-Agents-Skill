"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EAdd } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { CmsService } from "@/lib/services/cms.service";
import { defaultProject } from "@/content/projectDefaults";
import { projectHref } from "./projectModel";
import { projectDocumentName, projectSlug } from "./projectSlug";

export function AddProjectControl({
  roster,
  indexPath,
  defaultCategory = "",
}: {
  roster: JsonObject[];
  indexPath: PathSegment[];
  /** Saves the editor a step and avoids an empty category chip. */
  defaultCategory?: string;
}) {
  const { editing, ready } = useCmsEditing();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!editing || !ready) return null;

  const create = async () => {
    if (busy) return;
    const slug = projectSlug(title);
    const taken = roster.some((entry) => entry.slug === slug);
    if (taken) {
      setError("A project with that address already exists.");
      return;
    }

    // Write the document first, carrying the title the editor just typed.
    // Without this the project would load from the blank template and be
    // called "New Project".
    setBusy(true);
    try {
      await CmsService.saveDraft(
        projectDocumentName(slug),
        defaultProject({ title: title.trim(), slug, category: defaultCategory }),
        0,
        0,
      );
    } catch {
      setBusy(false);
      setError("Could not create the project. Check you are still signed in.");
      return;
    }

    setPath(indexPath, [...roster, { id: createCmsItemId("project"), slug }]);
    setTitle("");
    setOpen(false);
    setBusy(false);
    setError("");
    router.push(`${projectHref(slug)}?edit=1`);
  };

  if (!open) return <EAdd onAdd={() => setOpen(true)} label="Add project" />;

  return (
    <div data-cms-ui className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={title}
        placeholder="Project title"
        onChange={(event) => {
          setTitle(event.currentTarget.value);
          setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && title.trim()) void create();
          if (event.key === "Escape") setOpen(false);
        }}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
      />
      <button
        type="button"
        data-cms-ui
        disabled={!title.trim() || busy}
        onClick={() => void create()}
        className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-brand-contrast hover:bg-brand-strong disabled:opacity-40"
      >
        {busy ? "Creating…" : "Create"}
      </button>
      <button
        type="button"
        data-cms-ui
        onClick={() => {
          setOpen(false);
          setError("");
        }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
