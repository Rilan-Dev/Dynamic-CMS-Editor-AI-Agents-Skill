import { describe, expect, it } from "vitest";
import type { JsonObject } from "@/components/cms/json";
import { defaultUpdatesIndex, newUpdateEntry } from "@/content/updateDefaults";
import {
  buildUpdates,
  dayKey,
  filterByType,
  groupByDay,
  isFresh,
  latestEntries,
  publishedEntries,
  relativeTime,
} from "./updatesModel";

// 2026-09-25 14:00 in Dubai (UTC+4).
const NOW = new Date("2026-09-25T10:00:00.000Z");

const entry = (id: string, postedAt: string, overrides: JsonObject = {}): JsonObject => ({
  id,
  headline: `Update ${id}`,
  postedAt,
  type: "milestone",
  image: "",
  body: "",
  pinned: false,
  status: "published",
  ...overrides,
});

const feed = (entries: JsonObject[]) =>
  buildUpdates({ ...defaultUpdatesIndex(), entries } as JsonObject);

describe("buildUpdates", () => {
  it("reads defaults: types, a 7-day freshness window and page size", () => {
    const updates = buildUpdates(defaultUpdatesIndex());
    expect(updates.types.length).toBeGreaterThan(0);
    expect(updates.freshnessDays).toBe(7);
    expect(updates.pageSize).toBe(10);
    expect(updates.entries).toEqual([]);
  });

  it("orders entries newest first and drops ones without a headline or date", () => {
    const updates = feed([
      entry("old", "2026-09-20T08:00:00.000Z"),
      entry("new", "2026-09-25T09:00:00.000Z"),
      entry("no-headline", "2026-09-24T08:00:00.000Z", { headline: "" }),
      entry("bad-date", "not a date"),
    ]);
    expect(updates.entries.map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("treats anything but 'published' as a draft and ignores hidden entries", () => {
    const updates = feed([
      entry("a", "2026-09-25T09:00:00.000Z", { status: "live" }),
      entry("b", "2026-09-25T08:00:00.000Z", { visible: false }),
    ]);
    expect(updates.entries.map((e) => [e.id, e.status])).toEqual([["a", "draft"]]);
  });
});

describe("publishedEntries / filterByType / latestEntries", () => {
  const updates = feed([
    entry("a", "2026-09-25T09:00:00.000Z", { type: "milestone" }),
    entry("b", "2026-09-24T09:00:00.000Z", { type: "award" }),
    entry("c", "2026-09-23T09:00:00.000Z", { type: "award", status: "draft" }),
    entry("d", "2026-09-22T09:00:00.000Z", { type: "milestone" }),
  ]);

  it("keeps only published entries", () => {
    expect(publishedEntries(updates.entries).map((e) => e.id)).toEqual(["a", "b", "d"]);
  });

  it("filters by type, ignoring an empty filter", () => {
    expect(filterByType(updates.entries, "award").map((e) => e.id)).toEqual(["b", "c"]);
    expect(filterByType(updates.entries, "").map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("returns the newest published entries for the navbar preview", () => {
    expect(latestEntries(updates.entries, 2).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("dayKey", () => {
  it("uses the Dubai calendar day, not UTC", () => {
    // 22:30 UTC on the 24th is 02:30 on the 25th in Dubai.
    expect(dayKey("2026-09-24T22:30:00.000Z")).toBe("2026-09-25");
  });
});

describe("groupByDay", () => {
  it("labels Today and Yesterday, dates otherwise, newest group first", () => {
    const updates = feed([
      entry("today", "2026-09-25T06:00:00.000Z"),
      entry("yesterday", "2026-09-24T06:00:00.000Z"),
      entry("older", "2026-09-20T06:00:00.000Z"),
    ]);
    const groups = groupByDay(updates.entries, NOW);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "20 Sep 2026"]);
    expect(groups.map((g) => g.entries.map((e) => e.id))).toEqual([["today"], ["yesterday"], ["older"]]);
  });

  it("lifts pinned entries to the top of the newest group", () => {
    const updates = feed([
      entry("recent", "2026-09-25T09:00:00.000Z"),
      entry("pinned-old", "2026-09-10T09:00:00.000Z", { pinned: true }),
    ]);
    const groups = groupByDay(updates.entries, NOW);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["pinned-old", "recent"]);
    expect(groups.flatMap((g) => g.entries).filter((e) => e.id === "pinned-old")).toHaveLength(1);
  });
});

describe("relativeTime", () => {
  it("describes recent times in plain words", () => {
    expect(relativeTime("2026-09-25T09:59:40.000Z", NOW)).toBe("just now");
    expect(relativeTime("2026-09-25T09:45:00.000Z", NOW)).toBe("15m ago");
    expect(relativeTime("2026-09-25T07:00:00.000Z", NOW)).toBe("3h ago");
    expect(relativeTime("2026-09-24T09:00:00.000Z", NOW)).toBe("yesterday");
    expect(relativeTime("2026-09-21T09:00:00.000Z", NOW)).toBe("4 days ago");
    expect(relativeTime("2026-08-01T09:00:00.000Z", NOW)).toBe("1 Aug 2026");
  });
});

describe("isFresh", () => {
  it("is true when the newest published entry falls inside the window", () => {
    const updates = feed([entry("a", "2026-09-20T09:00:00.000Z")]);
    expect(isFresh(updates.entries, 7, NOW)).toBe(true);
    expect(isFresh(updates.entries, 3, NOW)).toBe(false);
  });

  it("ignores drafts and is false for an empty feed", () => {
    const updates = feed([entry("d", "2026-09-25T09:00:00.000Z", { status: "draft" })]);
    expect(isFresh(updates.entries, 7, NOW)).toBe(false);
    expect(isFresh([], 7, NOW)).toBe(false);
  });
});

describe("newUpdateEntry", () => {
  it("creates a draft timestamped now, with the given id and type", () => {
    const created = newUpdateEntry("u1", NOW, "milestone");
    expect(created).toMatchObject({
      id: "u1",
      postedAt: NOW.toISOString(),
      type: "milestone",
      status: "draft",
      pinned: false,
      visible: true,
    });
    expect(typeof created.headline).toBe("string");
  });
});

describe("unreadEntries", () => {
  const updates = feed([
    entry("new", "2026-09-25T09:00:00.000Z"),
    entry("mid", "2026-09-23T09:00:00.000Z"),
    entry("draft", "2026-09-25T08:00:00.000Z", { status: "draft" }),
    entry("old", "2026-09-01T09:00:00.000Z"),
  ]);

  it("shows a first-time visitor what is inside the freshness window", async () => {
    const { unreadEntries } = await import("./updatesModel");
    expect(unreadEntries(updates.entries, null, 7, NOW).map((e) => e.id)).toEqual(["new", "mid"]);
  });

  it("counts only what was posted since the last visit", async () => {
    const { unreadEntries } = await import("./updatesModel");
    expect(
      unreadEntries(updates.entries, "2026-09-24T00:00:00.000Z", 7, NOW).map((e) => e.id),
    ).toEqual(["new"]);
    expect(unreadEntries(updates.entries, NOW.toISOString(), 7, NOW)).toEqual([]);
  });

  it("ignores a corrupt stored timestamp", async () => {
    const { unreadEntries } = await import("./updatesModel");
    expect(unreadEntries(updates.entries, "garbage", 7, NOW).map((e) => e.id)).toEqual(["new", "mid"]);
  });
});

describe("latestUpdatesPayload", () => {
  it("keeps only the newest published entries, so page weight never grows with the feed", async () => {
    const { latestUpdatesPayload } = await import("./updatesModel");
    const entries = Array.from({ length: 20 }, (_, i) =>
      entry(`e${i}`, new Date(Date.UTC(2026, 8, 1 + i)).toISOString(), {
        status: i === 19 ? "draft" : "published",
      }),
    );
    const payload = latestUpdatesPayload({ ...defaultUpdatesIndex(), entries } as JsonObject, 6);
    expect((payload.entries as JsonObject[]).map((e) => e.id)).toEqual([
      "e18", "e17", "e16", "e15", "e14", "e13",
    ]);
    expect(payload.types).toEqual(defaultUpdatesIndex().types);
  });
});
