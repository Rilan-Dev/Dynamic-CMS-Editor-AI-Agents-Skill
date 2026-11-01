"use client";

import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { E } from "@/components/cms/editable";
import { EditableIcon } from "@/components/cms/EditableIcon";
import {
  InlineListControls,
  moveListItem,
  toggleListItemVisibility,
} from "@/components/cms/InlineListControls";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import { ReadOnlyIcon } from "@/components/cms/ReadOnlyIcon";
import { setPath, useCmsEditing } from "@/components/cms/store";

const asObjects = (value: unknown): JsonObject[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is JsonObject =>
          !!entry && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];

const text = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

/**
 * Company figures. They ship hidden with empty values: a visitor sees only
 * items an editor has filled in and switched on, and sees nothing at all —
 * not an empty band — until at least one is.
 */
export function ProjectStats({
  section,
  basePath,
}: {
  section: JsonObject;
  basePath: PathSegment[];
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const items = asObjects(section.items);
  const shown = items.filter((item) => item.visible !== false);

  if (!shown.length && !editActive) return null;

  const rendered = editActive
    ? items.map((item, index) => ({ item, index }))
    : items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.visible !== false);
  const hiddenCount = items.length - shown.length;
  const update = (next: JsonObject[]) => setPath([...basePath, "items"], next);

  return (
    <AnimatedSection id="projectsStats" label="Project stats" className="bg-background py-10 lg:py-14">
      <div className="container mx-auto px-4 md:px-6">
        {editActive && hiddenCount > 0 && (
          <p data-cms-ui className="mb-3 text-sm text-muted-foreground">
            {hiddenCount} of {items.length} stats are hidden from visitors. Enter a real,
            verifiable value before showing one.
          </p>
        )}

        <div className="flex flex-col gap-8 rounded-3xl border border-border bg-brand-soft p-7 sm:p-10 lg:flex-row lg:items-center lg:gap-10">
          <div className="lg:w-72 lg:shrink-0">
            <AnimatedElement
              id="stats-eyebrow"
              type="text"
              label="Stats eyebrow"
              as="p"
              className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong"
            >
              <E path={[...basePath, "eyebrow"]} value={text(section.eyebrow)} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="stats-title"
              type="heading"
              label="Stats title"
              as="h2"
              className="mt-2 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl"
            >
              <E path={[...basePath, "title"]} value={text(section.title)} as="span" />
            </AnimatedElement>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] lg:gap-0">
            {rendered.map(({ item, index }, position) => {
              const hidden = item.visible === false;
              const value = text(item.value);
              return (
                <AnimatedElement
                  key={text(item.id) || index}
                  id={`stat-${index}`}
                  type="card"
                  label={text(item.label) || `Stat ${index + 1}`}
                  staggerIndex={position}
                  className={`relative flex flex-col items-center text-center lg:border-l lg:border-border lg:px-4 ${
                    hidden ? "opacity-50" : ""
                  }`}
                >
                  {editActive && (
                    <InlineListControls
                      label={text(item.label) || `stat ${index + 1}`}
                      index={index}
                      count={items.length}
                      visible={!hidden}
                      axis="horizontal"
                      showPosition={false}
                      onMove={(to) => update(moveListItem(items, index, to))}
                      onToggleVisibility={
                        // Showing needs a real value; hiding is always allowed.
                        hidden && !value.trim()
                          ? undefined
                          : () => update(toggleListItemVisibility(items, index))
                      }
                    />
                  )}
                  <span className="order-1 flex h-11 w-11 items-center justify-center rounded-full bg-background text-brand shadow-sm">
                    {editActive ? (
                      <EditableIcon
                        path={[...basePath, "items", index, "icon"]}
                        value={item.icon}
                        className="h-5 w-5"
                      />
                    ) : (
                      <ReadOnlyIcon value={item.icon} className="h-5 w-5" />
                    )}
                  </span>
                  <dt className="order-3 mt-1 text-sm text-muted-foreground">
                    <E
                      path={[...basePath, "items", index, "label"]}
                      value={text(item.label)}
                      as="span"
                    />
                  </dt>
                  <dd className="order-2 mt-3 text-3xl font-bold tracking-tight text-foreground">
                    <E
                      path={[...basePath, "items", index, "value"]}
                      value={value}
                      as="span"
                      className="inline-block min-w-[2ch]"
                    />
                  </dd>
                </AnimatedElement>
              );
            })}
          </dl>
        </div>
      </div>
    </AnimatedSection>
  );
}
