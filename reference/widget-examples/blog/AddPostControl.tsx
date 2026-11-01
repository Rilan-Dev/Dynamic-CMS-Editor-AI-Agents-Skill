"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EAdd } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { CmsService } from "@/lib/services/cms.service";
import { defaultBlogPost } from "@/content/blogDefaults";
import { blogDocumentName, blogSlug } from "./blogSlug";

export function AddPostControl({
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
  const [error, setError] = useState("");

  if (!editing || !ready) return null;

  const create = async () => {
    const slug = blogSlug(title);
    const taken = roster.some((entry) => entry.slug === slug);
    if (taken) {
      setError("An article with that address already exists.");
      return;
    }

    // Write the document first, carrying the title the editor just typed.
    // Without this the post would load from the blank template and be
    // called "New Article".
    try {
      await CmsService.saveDraft(
        blogDocumentName(slug),
        defaultBlogPost({ title: title.trim(), slug, category: defaultCategory }),
        0,
        0,
      );
    } catch {
      setError("Could not create the article. Check you are still signed in.");
      return;
    }

    setPath(indexPath, [...roster, { id: createCmsItemId("post"), slug }]);
    setTitle("");
    setOpen(false);
    setError("");
    router.push(`/blogs/${slug}?edit=1`);
  };

  if (!open) return <EAdd onAdd={() => setOpen(true)} label="Add post" />;

  return (
    <div data-cms-ui className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={title}
        placeholder="Article title"
        onChange={(event) => setTitle(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && title.trim()) void create();
        }}
        className="rounded-md border border-border px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        data-cms-ui
        disabled={!title.trim()}
        onClick={() => void create()}
        className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-brand-contrast disabled:opacity-40"
      >
        Create
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
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
