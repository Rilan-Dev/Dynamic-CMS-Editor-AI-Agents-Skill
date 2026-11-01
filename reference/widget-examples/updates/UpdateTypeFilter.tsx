"use client";

import Link from "next/link";
import { E } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { useCmsEditing } from "@/components/cms/store";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** `/updates`, optionally filtered to one type. */
export function updatesHref(type?: string): string {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  const query = params.toString();
  return query ? `/updates?${query}` : "/updates";
}

// Same pill vocabulary as /projects, so filters read the same site-wide.
const pill =
  "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const activePill = "bg-brand text-brand-contrast shadow-sm";
const idlePill =
  "border border-border bg-card/80 text-foreground backdrop-blur hover:border-brand hover:text-brand-strong";

/**
 * Type pills. Real links (`?type=`), so a filtered feed is shareable and
 * works without JavaScript. Labels are edited in place on the `types` list.
 */
export function UpdateTypeFilter({
  types,
  activeType,
  allLabel,
}: {
  /** The raw `types` list of the updates document. */
  types: JsonObject[];
  activeType: string;
  allLabel: string;
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const shown = types
    .map((type, index) => ({ type, index }))
    .filter(({ type }) => editActive || (type.visible !== false && !!text(type.slug)));

  return (
    <nav aria-label="Update types" className="flex flex-wrap items-center gap-2.5">
      <Link
        href={updatesHref()}
        scroll={false}
        aria-current={activeType === "" ? "page" : undefined}
        className={`${pill} ${activeType === "" ? activePill : idlePill}`}
      >
        <E path={["filters", "allLabel"]} value={allLabel} as="span" />
      </Link>
      {shown.map(({ type, index }) => {
        const slug = text(type.slug);
        const active = activeType !== "" && activeType === slug;
        return (
          <Link
            key={text(type.id) || slug || index}
            href={updatesHref(slug)}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`${pill} ${active ? activePill : idlePill} ${
              type.visible === false ? "opacity-50" : ""
            }`}
          >
            <E path={["types", index, "label"]} value={text(type.label) || slug} as="span" />
          </Link>
        );
      })}
    </nav>
  );
}
