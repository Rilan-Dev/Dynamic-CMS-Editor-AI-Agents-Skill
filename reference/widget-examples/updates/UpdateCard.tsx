"use client";

import { Pin } from "lucide-react";
import { E, EImg } from "@/components/cms/editable";
import type { JsonValue } from "@/components/cms/json";
import { useCmsEditing } from "@/components/cms/store";
import { assetSrc } from "@/content/types";
import { UpdateEditorControls } from "./UpdateEditorControls";
import { relativeTime, UPDATES_TIME_ZONE, type UpdateEntry } from "./updatesModel";

/** Bodies longer than this collapse behind "Read more". */
export const LONG_BODY_CHARS = 240;

/** "20 Sep 2026, 14:05" in Dubai time — deterministic, so safe to SSR. */
export function absoluteStamp(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: UPDATES_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}:${part("minute")}`;
}

/** The first ~LONG_BODY_CHARS characters, cut at a word boundary. */
export function excerpt(body: string): string {
  const cut = body.slice(0, LONG_BODY_CHARS);
  const space = cut.lastIndexOf(" ");
  return `${(space > LONG_BODY_CHARS * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function UpdateCard({
  entry,
  entries,
  now,
  typeLabel,
  readMoreLabel,
  isNew = false,
  newLabel = "new",
}: {
  entry: UpdateEntry;
  /** The raw stored `entries` array — the editor controls remove from it. */
  entries: JsonValue[];
  /** `null` until mounted: absolute time until then (see useNow). */
  now: Date | null;
  typeLabel?: string;
  readMoreLabel: string;
  /** Posted since this visitor last opened the feed. */
  isNew?: boolean;
  newLabel?: string;
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const imageSrc = assetSrc(entry.image);
  const stamp = now ? relativeTime(entry.postedAt, now) : absoluteStamp(entry.postedAt);
  const long = entry.body.length > LONG_BODY_CHARS;
  const draft = entry.status === "draft";

  return (
    <article
      id={`update-${entry.id}`}
      className={`scroll-mt-28 rounded-2xl border bg-card p-5 shadow-sm transition-shadow target:ring-2 target:ring-brand sm:p-6 ${
        draft ? "border-dashed border-muted-foreground/60" : "border-border hover:shadow-md"
      }`}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <time
          dateTime={entry.postedAt}
          title={absoluteStamp(entry.postedAt)}
          className="font-medium tabular-nums text-muted-foreground"
        >
          {stamp}
        </time>
        {isNew && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-contrast">
            {newLabel}
          </span>
        )}
        {typeLabel && (
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-semibold text-brand-strong">
            {typeLabel}
          </span>
        )}
        {entry.pinned && (
          <span className="inline-flex items-center gap-1 font-semibold text-brand-strong">
            <Pin size={12} aria-hidden="true" className="rotate-45" />
            Pinned
          </span>
        )}
        {draft && (
          <span className="rounded-full bg-inverse px-2.5 py-0.5 font-bold uppercase tracking-wide text-inverse-foreground">
            Draft
          </span>
        )}
      </header>

      <E
        path={["entries", entry.index, "headline"]}
        value={entry.headline}
        as="h3"
        className="mt-3 text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl"
      />

      {(editActive || imageSrc) && (
        <div
          className={`relative mt-4 aspect-[16/9] overflow-hidden rounded-xl bg-muted ${
            imageSrc ? "" : "border border-dashed border-border"
          }`}
        >
          <EImg
            path={["entries", entry.index, "image"]}
            image={{ src: imageSrc, alt: entry.headline }}
            storedAs="string"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {editActive ? (
        <E
          path={["entries", entry.index, "body"]}
          value={entry.body}
          as="p"
          multilineBreaks
          className="mt-3 min-h-[1.5em] whitespace-pre-line leading-relaxed text-muted-foreground"
        />
      ) : entry.body && !long ? (
        <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
          {entry.body}
        </p>
      ) : entry.body ? (
        // Native disclosure: keyboard- and screen-reader-accessible with no
        // JS. The excerpt hides once open; the summary moves below the full
        // text where `details` can be a flex container (graceful elsewhere).
        <div className="group/body mt-3">
          <p className="leading-relaxed text-muted-foreground group-has-[details[open]]/body:hidden">
            {excerpt(entry.body)}
          </p>
          <details className="group/more open:flex open:flex-col">
            <summary className="mt-2 inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-strong hover:text-brand [&::-webkit-details-marker]:hidden group-open/more:order-last">
              <span className="group-open/more:hidden">{readMoreLabel}</span>
              <span className="hidden group-open/more:inline">Show less</span>
            </summary>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {entry.body}
            </p>
          </details>
        </div>
      ) : null}

      <UpdateEditorControls entry={entry} entries={entries} />
    </article>
  );
}
