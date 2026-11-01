"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { E, EAdd, ERemove } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { blogSlug } from "./blogSlug";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const pillClass = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
    active ? "bg-brand text-brand-contrast" : "bg-muted text-muted-foreground hover:bg-accent"
  }`;

/**
 * Category pills and search for /blogs.
 *
 * The pills are the `categories` list of the `blogs` document and are
 * edited in place, exactly like the project categories: rename a pill by
 * typing on it, remove it with its minus control, add one with "+". The
 * slug is derived once from the name typed when adding — posts store it,
 * so renaming a pill later changes only its label.
 */
export function BlogFilters({
  categories,
  usage,
  activeCategory,
  query,
  allLabel,
  placeholder,
  onChange,
}: {
  /** The raw `categories` list of the blogs document. */
  categories: JsonObject[];
  /** How many posts use each category slug (drafts included for editors). */
  usage: Map<string, number>;
  activeCategory: string;
  query: string;
  allLabel: string;
  placeholder: string;
  onChange: (patch: { category?: string; query?: string }) => void;
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const shown = categories
    .map((category, index) => ({ category, index }))
    .filter(
      ({ category }) => editActive || (category.visible !== false && !!text(category.slug)),
    );

  const remove = (index: number) => {
    const category = categories[index];
    const used = usage.get(text(category.slug)) ?? 0;
    if (
      used > 0 &&
      !window.confirm(
        `${used} article${used === 1 ? " uses" : "s use"} “${text(category.label) || text(category.slug)}”. ` +
          "Remove the category anyway? Those articles will need a new category before they can be published again.",
      )
    ) {
      return;
    }
    setPath(
      ["categories"],
      categories.filter((_, position) => position !== index),
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav aria-label="Blog categories" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={activeCategory === ""}
          onClick={() => onChange({ category: "" })}
          className={pillClass(activeCategory === "")}
        >
          <E path={["search", "allLabel"]} value={allLabel} as="span" />
        </button>
        {shown.map(({ category, index }) => {
          const slug = text(category.slug);
          const label = text(category.label) || slug;
          return (
            <span key={text(category.id) || slug || index} className="inline-flex items-center gap-1">
              <button
                type="button"
                aria-pressed={activeCategory === slug}
                onClick={() => onChange({ category: slug })}
                className={`${pillClass(activeCategory !== "" && activeCategory === slug)} ${
                  category.visible === false ? "opacity-50" : ""
                }`}
              >
                <E path={["categories", index, "label"]} value={label} as="span" />
              </button>
              <ERemove label={`${label} category`} onRemove={() => remove(index)} />
            </span>
          );
        })}
        {editActive && <AddCategoryControl categories={categories} />}
      </nav>

      <label className="relative w-full max-w-xs">
        <span className="sr-only">{placeholder}</span>
        <Search
          size={16}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          placeholder={placeholder}
          onChange={(event) => onChange({ query: event.currentTarget.value })}
          className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-brand focus:outline-none"
        />
      </label>
    </div>
  );
}

function AddCategoryControl({ categories }: { categories: JsonObject[] }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    const slug = blogSlug(label);
    if (!/[a-z0-9]/i.test(label)) {
      setError("Use letters or numbers in the name.");
      return;
    }
    if (categories.some((category) => category.slug === slug)) {
      setError("That category already exists.");
      return;
    }
    setPath(
      ["categories"],
      [
        ...categories,
        { id: createCmsItemId("category"), slug, label: label.trim(), visible: true },
      ],
    );
    setLabel("");
    setError("");
    setOpen(false);
  };

  if (!open) return <EAdd onAdd={() => setOpen(true)} label="Add category" />;

  return (
    <span data-cms-ui className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={label}
        placeholder="Category name"
        onChange={(event) => setLabel(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && label.trim()) add();
          if (event.key === "Escape") setOpen(false);
        }}
        className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
      />
      <button
        type="button"
        data-cms-ui
        disabled={!label.trim()}
        onClick={add}
        className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-brand-contrast hover:bg-brand-strong disabled:opacity-40"
      >
        Add
      </button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </span>
  );
}
