"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Megaphone } from "lucide-react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { E } from "@/components/cms/editable";
import type { JsonObject, JsonValue } from "@/components/cms/json";
import { useCmsEditing, useSection } from "@/components/cms/store";
import { UpdateCard } from "@/components/updates/UpdateCard";
import { UpdateComposer } from "@/components/updates/UpdateComposer";
import { UpdateTypeFilter } from "@/components/updates/UpdateTypeFilter";
import {
  buildUpdates,
  filterByType,
  groupByDay,
  publishedEntries,
} from "@/components/updates/updatesModel";
import { useNow } from "@/components/updates/useNow";
import { useUpdatesSeen } from "@/components/updates/useUpdatesSeen";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asObjects = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.map(asObject) : [];

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Grouping reference used until mount. Against the epoch no entry is
 * "today" or "yesterday", so every group gets a plain date label — the
 * same on the server and the client's first render.
 */
const NO_RELATIVE_DAYS = new Date(0);

export default function UpdatesPage({ content }: { content: JsonObject }) {
  const { editing, ready, showDrafts } = useCmsEditing();
  const editActive = editing && ready;
  const searchParams = useSearchParams();
  const now = useNow();

  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const filters = useSection(["filters"], asObject(content.filters));
  const composer = useSection(["composer"], asObject(content.composer));
  const empty = useSection(["empty"], asObject(content.empty));
  const document = asObject(useSection([], content));
  const feed = useMemo(() => buildUpdates(document), [document]);
  const storedEntries: JsonValue[] = Array.isArray(document.entries) ? document.entries : [];

  const activeType = searchParams?.get("type") ?? "";
  const typeLabels = new Map(feed.types.map((type) => [type.slug, type.label]));

  // Editors see drafts (marked on the card); visitors never do. The route
  // already strips drafts server-side — this is the second line.
  const listed = showDrafts && ready ? feed.entries : publishedEntries(feed.entries);
  const matching = filterByType(listed, activeType);

  // "Load more" over entries, not days: a day with twenty posts must not
  // blow past the page size. The count resets when the filter changes.
  const [paging, setPaging] = useState({ key: activeType, count: feed.pageSize });
  const count = paging.key === activeType ? paging.count : feed.pageSize;
  const visible = matching.slice(0, count);
  const groups = groupByDay(visible, now ?? NO_RELATIVE_DAYS);

  const nothingListed = listed.length === 0;

  // Opening the feed marks everything as seen (clearing the navbar badge),
  // but what was new on arrival keeps its "New" tag for this visit.
  const published = useMemo(() => publishedEntries(feed.entries), [feed]);
  const { unreadIds, markSeen, now: seenNow } = useUpdatesSeen(published, feed.freshnessDays);
  const [newOnArrival, setNewOnArrival] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (newOnArrival || !seenNow) return;
    setNewOnArrival(unreadIds);
    markSeen();
  }, [newOnArrival, seenNow, unreadIds, markSeen]);

  return (
    <AnimatedPage id="updates" label="Updates" animations={animations} className="flex flex-col">
      {/* ---------------- hero ---------------- */}
      <AnimatedSection
        id="updatesHero"
        label="Updates hero"
        className="relative isolate overflow-hidden bg-background"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-soft via-background to-background"
        />
        <div className="container mx-auto px-4 pb-10 pt-14 md:px-6 lg:pb-12 lg:pt-20">
          <div className="mx-auto max-w-3xl">
            <AnimatedElement
              id="updates-eyebrow"
              type="text"
              label="Updates eyebrow"
              as="p"
              className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong"
            >
              <E path={["hero", "eyebrow"]} value={text(hero.eyebrow)} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="updates-title"
              type="heading"
              label="Updates title"
              as="h1"
              className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-5xl"
            >
              <E path={["hero", "title"]} value={text(hero.title)} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="updates-subtitle"
              type="text"
              label="Updates subtitle"
              as="p"
              className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground"
            >
              <E
                path={["hero", "subtitle"]}
                value={text(hero.subtitle)}
                as="span"
                multilineBreaks
              />
            </AnimatedElement>
            <div className="mt-8">
              <UpdateTypeFilter
                types={asObjects(document.types)}
                activeType={activeType}
                allLabel={text(filters.allLabel) || "All updates"}
              />
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ---------------- feed ---------------- */}
      <AnimatedSection id="updatesFeed" label="Updates feed" className="bg-background pb-20 pt-4 lg:pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10">
              <UpdateComposer
                entries={storedEntries}
                types={feed.types}
                placeholder={text(composer.placeholder) || "Share today's update…"}
                buttonLabel={text(composer.buttonLabel) || "Post update"}
              />
            </div>

            {nothingListed ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                  <Megaphone size={26} aria-hidden="true" />
                </span>
                <E
                  path={["empty", "title"]}
                  value={text(empty.title)}
                  as="h2"
                  className="mt-5 text-2xl font-bold tracking-tight text-foreground"
                />
                <E
                  path={["empty", "body"]}
                  value={text(empty.body)}
                  as="p"
                  multilineBreaks
                  className="mt-3 max-w-md text-muted-foreground"
                />
              </div>
            ) : matching.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
                <E
                  path={["empty", "noMatch"]}
                  value={text(empty.noMatch) || "No updates of this type yet."}
                  as="span"
                />
              </p>
            ) : (
              <div className="relative">
                {/* The rail. Dots sit on it at each day heading. */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-2 left-[7px] top-2 w-px bg-border"
                />
                {groups.map((group, groupIndex) => (
                  <section
                    key={group.key}
                    aria-labelledby={`updates-day-${group.key}`}
                    className="relative pb-10 pl-9 last:pb-0 sm:pl-11"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1 h-[15px] w-[15px] rounded-full ring-4 ring-background ${
                        groupIndex === 0
                          ? "bg-brand"
                          : "border-2 border-brand bg-background"
                      }`}
                    />
                    <h2
                      id={`updates-day-${group.key}`}
                      className="text-sm font-bold uppercase tracking-[0.16em] text-foreground"
                    >
                      {group.label}
                    </h2>
                    <ol className="mt-4 space-y-5">
                      {group.entries.map((entry, position) => (
                        <li key={entry.id}>
                          <AnimatedElement
                            id={`update-card-${groupIndex}-${position}`}
                            type="card"
                            label={entry.headline || "Update"}
                            staggerIndex={position % 3}
                          >
                            <UpdateCard
                              entry={entry}
                              entries={storedEntries}
                              now={now}
                              typeLabel={typeLabels.get(entry.type)}
                              isNew={!!newOnArrival?.has(entry.id)}
                              newLabel={text(asObject(document.navbar).newLabel) || "new"}
                              readMoreLabel={text(document.readMoreLabel) || "Read more"}
                            />
                          </AnimatedElement>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}

            {matching.length > count && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setPaging({ key: activeType, count: count + feed.pageSize })
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand-strong"
                >
                  <E
                    path={["loadMoreLabel"]}
                    value={text(document.loadMoreLabel) || "Load more updates"}
                    as="span"
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
