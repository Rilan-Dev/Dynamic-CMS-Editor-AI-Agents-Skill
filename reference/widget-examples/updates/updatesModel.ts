import type { JsonObject } from "@/components/cms/json";

export const UPDATES_TIME_ZONE = "Asia/Dubai";

export interface UpdateType {
  id: string;
  slug: string;
  label: string;
}

export interface UpdateEntry {
  id: string;
  /** Position in the stored `entries` array — the CMS edits by this path. */
  index: number;
  headline: string;
  postedAt: string;
  type: string;
  image: unknown;
  body: string;
  pinned: boolean;
  status: "draft" | "published";
}

export interface UpdatesFeed {
  types: UpdateType[];
  freshnessDays: number;
  pageSize: number;
  /** Newest first. Includes drafts; filter with publishedEntries. */
  entries: UpdateEntry[];
}

export interface DayGroup {
  key: string;
  label: string;
  entries: UpdateEntry[];
}

const DEFAULT_FRESHNESS_DAYS = 7;
const DEFAULT_PAGE_SIZE = 10;
const DAY_MS = 86_400_000;

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const positive = (value: unknown, fallback: number): number =>
  typeof value === "number" && value > 0 ? value : fallback;

const validDate = (iso: string): boolean => iso !== "" && !Number.isNaN(Date.parse(iso));

export function buildUpdates(document: JsonObject): UpdatesFeed {
  const types = (Array.isArray(document.types) ? document.types : [])
    .map(asObject)
    .filter((type): type is JsonObject => !!type && type.visible !== false && !!text(type.slug))
    .map((type, index) => ({
      id: text(type.id) || `type-${index}`,
      slug: text(type.slug),
      label: text(type.label) || text(type.slug),
    }));

  const entries = (Array.isArray(document.entries) ? document.entries : [])
    .map((value, index) => ({ value: asObject(value), index }))
    .filter(
      (item): item is { value: JsonObject; index: number } =>
        !!item.value &&
        item.value.visible !== false &&
        !!text(item.value.headline).trim() &&
        validDate(text(item.value.postedAt)),
    )
    .map(({ value, index }) => ({
      id: text(value.id) || `update-${index}`,
      index,
      headline: text(value.headline),
      postedAt: text(value.postedAt),
      type: text(value.type),
      image: value.image,
      body: text(value.body),
      pinned: value.pinned === true,
      status: value.status === "published" ? ("published" as const) : ("draft" as const),
    }))
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));

  return {
    types,
    freshnessDays: positive(document.freshnessDays, DEFAULT_FRESHNESS_DAYS),
    pageSize: positive(document.pageSize, DEFAULT_PAGE_SIZE),
    entries,
  };
}

export const publishedEntries = (entries: UpdateEntry[]): UpdateEntry[] =>
  entries.filter((entry) => entry.status === "published");

export const filterByType = (entries: UpdateEntry[], type: string): UpdateEntry[] =>
  type ? entries.filter((entry) => entry.type === type) : entries;

/** The newest published entries — the navbar preview. */
export const latestEntries = (entries: UpdateEntry[], count: number): UpdateEntry[] =>
  publishedEntries(entries).slice(0, count);

/** Calendar day of a timestamp in the audience's time zone, as YYYY-MM-DD. */
export function dayKey(iso: string, timeZone = UPDATES_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * "20 Sep 2026". Assembled from en-US parts because en-GB's abbreviation
 * for September changed to "Sept" in recent ICU data — formatting with
 * en-GB would make the output depend on the Node/ICU version.
 */
const formatDate = (iso: string, timeZone = UPDATES_TIME_ZONE): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("year")}`;
};

/**
 * Entries grouped by calendar day, newest day first. Pinned entries are
 * lifted to the top of the newest group, out of their own day.
 */
export function groupByDay(
  entries: UpdateEntry[],
  now: Date,
  timeZone = UPDATES_TIME_ZONE,
): DayGroup[] {
  const today = dayKey(now.toISOString(), timeZone);
  const yesterday = dayKey(new Date(now.getTime() - DAY_MS).toISOString(), timeZone);

  const pinned = entries.filter((entry) => entry.pinned);
  const rest = entries.filter((entry) => !entry.pinned);

  const groups: DayGroup[] = [];
  for (const entry of rest) {
    const key = dayKey(entry.postedAt, timeZone);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = {
        key,
        label: key === today ? "Today" : key === yesterday ? "Yesterday" : formatDate(entry.postedAt, timeZone),
        entries: [],
      };
      groups.push(group);
    }
    group.entries.push(entry);
  }

  if (pinned.length) {
    if (groups.length) groups[0].entries.unshift(...pinned);
    else groups.push({ key: "pinned", label: "Pinned", entries: pinned });
  }
  return groups;
}

/** "just now", "15m ago", "3h ago", "yesterday", "4 days ago", else a date. */
export function relativeTime(postedAt: string, now: Date, timeZone = UPDATES_TIME_ZONE): string {
  const elapsed = now.getTime() - Date.parse(postedAt);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(postedAt, timeZone);
}

/** Whether the newest published entry is within the freshness window. */
export function isFresh(entries: UpdateEntry[], freshnessDays: number, now: Date): boolean {
  const [newest] = publishedEntries(entries);
  if (!newest) return false;
  return now.getTime() - Date.parse(newest.postedAt) <= freshnessDays * DAY_MS;
}

/**
 * Draft entries live in the same published document as live ones (an
 * entry's status is separate from the document's publish state). Strip
 * them wherever the document reaches a visitor's HTML/RSC payload — the
 * `/updates` route and the navbar preview both need this; editors read the
 * full document through the CMS store instead.
 */
export function withoutDraftEntries(document: JsonObject): JsonObject {
  if (!Array.isArray(document.entries)) return document;
  return {
    ...document,
    entries: document.entries.filter(
      (entry) =>
        !!entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        (entry as JsonObject).status === "published",
    ),
  };
}

/**
 * Published entries this visitor has not seen: newer than the last time
 * they opened /updates, and never older than the freshness window — so a
 * first-time visitor is shown what is recent, not the whole archive.
 */
export function unreadEntries(
  entries: UpdateEntry[],
  seenAt: string | null,
  freshnessDays: number,
  now: Date,
): UpdateEntry[] {
  const windowStart = now.getTime() - freshnessDays * DAY_MS;
  const seen = seenAt ? Date.parse(seenAt) : Number.NaN;
  const since = Number.isNaN(seen) ? windowStart : Math.max(seen, windowStart);
  return publishedEntries(entries).filter((entry) => Date.parse(entry.postedAt) > since);
}

/**
 * The updates document trimmed for surfaces that show only the newest
 * posts (navbar preview, announcement, home band): drafts removed and at
 * most `limit` published entries kept, newest first. Every page embeds
 * this, so it must not grow with the feed — a daily feed would otherwise
 * add every post ever written to every page's HTML.
 */
export function latestUpdatesPayload(document: JsonObject, limit = 6): JsonObject {
  const published = withoutDraftEntries(document);
  if (!Array.isArray(published.entries)) return published;
  const newest = [...published.entries]
    .filter((entry): entry is JsonObject => !!entry && typeof entry === "object" && !Array.isArray(entry))
    .sort((a, b) => Date.parse(String(b.postedAt)) - Date.parse(String(a.postedAt)))
    .slice(0, limit);
  return { ...published, entries: newest };
}
