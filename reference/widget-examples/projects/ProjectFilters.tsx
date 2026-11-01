"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { E, EAdd, ERemove } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { humanizeSlug } from "./ProjectCard";
import { projectSlug } from "./projectSlug";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** `/projects` with the given filters; empty values are dropped. */
export function projectsHref(filter: { category?: string; service?: string }): string {
  const params = new URLSearchParams();
  if (filter.category) params.set("category", filter.category);
  if (filter.service) params.set("service", filter.service);
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const activePill = "bg-brand text-brand-contrast shadow-sm";
const idlePill =
  "border border-border bg-card/80 text-foreground backdrop-blur hover:border-brand hover:text-brand-strong";

/**
 * Category pills for the hero. Each pill is a real link (`?category=`), so
 * a filtered listing is shareable and works without JavaScript. The
 * service filter set by service pages survives a category change.
 */
export function ProjectFilters({
  categories,
  activeCategory,
  activeService,
  activeServiceLabel,
  allLabel,
}: {
  /** The raw `categories` list of the index document. */
  categories: JsonObject[];
  activeCategory: string;
  activeService: string;
  /** The service's real title, resolved from the services catalogue; falls back to the humanized slug. */
  activeServiceLabel?: string;
  allLabel: string;
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const shown = categories
    .map((category, index) => ({ category, index }))
    .filter(
      ({ category }) =>
        editActive || (category.visible !== false && !!text(category.slug)),
    );

  return (
    <nav aria-label="Project categories" className="flex flex-wrap items-center gap-2.5">
      <Link
        href={projectsHref({ service: activeService })}
        scroll={false}
        aria-current={activeCategory === "" ? "page" : undefined}
        className={`${pill} ${activeCategory === "" ? activePill : idlePill}`}
      >
        <E path={["filters", "allLabel"]} value={allLabel} as="span" />
      </Link>

      {shown.map(({ category, index }) => {
        const slug = text(category.slug);
        const active = activeCategory !== "" && activeCategory === slug;
        return (
          <span key={text(category.id) || slug || index} className="inline-flex items-center gap-1">
            <Link
              href={projectsHref({ category: slug, service: activeService })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`${pill} ${active ? activePill : idlePill} ${
                category.visible === false ? "opacity-50" : ""
              }`}
            >
              <E
                path={["categories", index, "label"]}
                value={text(category.label) || humanizeSlug(slug)}
                as="span"
              />
            </Link>
            <ERemove
              label={`${text(category.label) || slug} category`}
              onRemove={() =>
                setPath(
                  ["categories"],
                  categories.filter((_, position) => position !== index),
                )
              }
            />
          </span>
        );
      })}

      {activeService && (
        <Link
          href={projectsHref({ category: activeCategory })}
          scroll={false}
          aria-label={`Clear the ${activeServiceLabel || humanizeSlug(activeService)} service filter`}
          className={`${pill} border border-brand bg-brand-soft text-brand-strong hover:bg-brand-soft-strong`}
        >
          {activeServiceLabel || humanizeSlug(activeService)}
          <X size={14} aria-hidden="true" />
        </Link>
      )}

      {editActive && <AddCategoryControl categories={categories} />}
    </nav>
  );
}

/**
 * The slug is derived once, from the label typed here, because projects
 * store it: renaming a pill later changes the label only, never the slug.
 */
function AddCategoryControl({ categories }: { categories: JsonObject[] }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    const slug = projectSlug(label);
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
