import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme/contrast";
import { readThemeTokens } from "@/lib/theme/tokens";

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const route = read("app/updates/page.tsx");
const page = read("components/pages/UpdatesPage.tsx");
const card = read("components/updates/UpdateCard.tsx");
const filter = read("components/updates/UpdateTypeFilter.tsx");
const composer = read("components/updates/UpdateComposer.tsx");
const controls = read("components/updates/UpdateEditorControls.tsx");
const useNow = read("components/updates/useNow.ts");
const timeline = `${page}\n${card}`;

describe("updates route", () => {
  it("reads the updates document and wraps the URL-driven feed in Suspense", () => {
    expect(route).toContain('getPageContent("updates", CONTENT_REGISTRY.updates)');
    expect(route).toContain("<Suspense fallback={null}>");
    expect(route).toContain("<UpdatesPage");
  });

  it("has canonical metadata", () => {
    expect(route).toContain('title: "News & Updates"');
    expect(route).toContain('alternates: { canonical: "/updates" }');
  });

  it("strips draft entries before the document crosses to the client", () => {
    expect(route).toContain("withoutDraftEntries(");
  });
});

describe("hydration: time-dependent output waits for mount", () => {
  it("useNow starts null and only reads the clock inside an effect", () => {
    expect(useNow).toContain("useState<Date | null>(null)");
    expect(useNow).toContain("useEffect(");
    expect(useNow).toContain("setInterval(");
    expect(useNow).toContain("clearInterval(");
  });

  it("never calls relativeTime without a non-null now", () => {
    const calls = timeline.match(/relativeTime\(/g) ?? [];
    const guarded = timeline.match(/now\s*\?\s*relativeTime\(/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    expect(guarded.length).toBe(calls.length);
  });

  it("groups by day against a fixed reference until mounted, so no Today/Yesterday during SSR", () => {
    expect(page).toContain("groupByDay(");
    expect(page).toMatch(/groupByDay\([^)]*now \?\? NO_RELATIVE_DAYS/);
    expect(page).toContain("new Date(0)");
    expect(page).toContain("useNow()");
  });

  it("does not read the clock during render", () => {
    // `new Date()` with no argument is the current time; only the composer's
    // click handler and useNow's effect may call it.
    expect(page).not.toMatch(/new Date\(\)/);
    expect(card).not.toMatch(/new Date\(\)/);
    expect(card).not.toContain("Date.now(");
  });
});

describe("timeline cards", () => {
  it("carry the update-<id> anchor for navbar deep links", () => {
    expect(card).toContain("id={`update-${entry.id}`}");
  });

  it("edit by the stored-array index, never the sorted position", () => {
    expect(card).toContain('["entries", entry.index, "headline"]');
    expect(card).toContain('["entries", entry.index, "body"]');
    expect(card).toContain('["entries", entry.index, "image"]');
    expect(controls).toContain('["entries", entry.index, "status"]');
    expect(controls).toContain('["entries", entry.index, "pinned"]');
    expect(controls).toContain('["entries", entry.index, "postedAt"]');
  });

  it("collapses a long body behind a native details/summary", () => {
    expect(card).toContain("LONG_BODY_CHARS = 240");
    expect(card).toContain("<details");
    expect(card).toContain("<summary");
  });

  it("omits the image for visitors when empty", () => {
    expect(card).toMatch(/editActive \|\| imageSrc/);
  });

  it("marks drafts for editors", () => {
    expect(card).toContain('entry.status === "draft"');
  });
});

describe("feed page", () => {
  it("hides drafts from visitors", () => {
    expect(page).toContain("showDrafts && ready ? feed.entries : publishedEntries(feed.entries)");
  });

  it("filters by ?type= and pages with load more", () => {
    expect(page).toContain('searchParams?.get("type")');
    expect(page).toContain("filterByType(");
    expect(page).toContain("feed.pageSize");
    expect(page).toContain('["loadMoreLabel"]');
    expect(filter).toContain("params.set(\"type\"");
  });

  it("shows the empty state when nothing is published", () => {
    expect(page).toContain('["empty", "title"]');
    expect(page).toContain('["empty", "body"]');
  });

  it("mounts the composer and editor controls", () => {
    expect(page).toContain("<UpdateComposer");
    expect(card).toContain("<UpdateEditorControls");
  });
});

describe("composer", () => {
  it("prepends a draft carrying the typed headline", () => {
    expect(composer).toContain('newUpdateEntry(createCmsItemId("update"), new Date(), type)');
    expect(composer).toContain("headline: headline.trim()");
    expect(composer).toMatch(/setPath\(\["entries"\], \[\s*entry,\s*\.\.\.entries\s*\]\)/);
  });

  it("only renders for editors", () => {
    expect(composer).toContain("if (!editing || !ready) return null;");
    expect(controls).toContain("if (!editing || !ready) return null;");
  });
});

describe("contrast of the new text-on-fill pairs", () => {
  const pairs: [string, string][] = [
    ["brand-strong", "brand-soft"],
    ["brand-contrast", "brand"],
    ["inverse-foreground", "inverse"],
    ["muted-foreground", "muted"],
  ];
  const themes = readThemeTokens();
  for (const theme of ["light", "dark"] as const) {
    for (const [fg, bg] of pairs) {
      it(`${fg} on ${bg} meets AA in ${theme}`, () => {
        const tokens = themes[theme];
        expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
