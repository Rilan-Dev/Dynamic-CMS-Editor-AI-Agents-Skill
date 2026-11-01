import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * Parked legacy routes are not live and must not be "fixed" (CLAUDE.md).
 * Tests are excluded because they quote banned literals in assertions.
 */
const EXCLUDED = [/\.test\.tsx?$/, /^app\/team-bak\//, /^app\/projects-back\//];

/**
 * Discovered, not listed. The first pass used an explicit 13-file list and
 * missed every subdirectory — ~70% of the site's hardcoded colour — while
 * reporting the migration complete. New components are covered the moment
 * they exist.
 */
function themedFiles(): string[] {
  return ["components", "app"].flatMap((dir) =>
    (readdirSync(join(ROOT, dir), { recursive: true }) as string[])
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => `${dir}/${file.split("\\").join("/")}`)
      .filter((file) => !EXCLUDED.some((re) => re.test(file))),
  );
}

const THEMED_FILES = themedFiles();

/** The original 13; discovery must always still find them. */
const ORIGINAL_SCOPE = [
  "components/navbar.tsx",
  "components/footer.tsx",
  "components/client-logos.tsx",
  "components/testimonial-slider.tsx",
  "components/service-card.tsx",
  "components/pages/HomePage.tsx",
  "components/pages/AboutPage.tsx",
  "components/pages/ServicesPage.tsx",
  "components/pages/CertificationsPage.tsx",
  "components/pages/ContactPage.tsx",
  "components/pages/CareersPage.tsx",
  "components/pages/BlogsPage.tsx",
  "components/pages/BlogPostPage.tsx",
];

const PENDING_THEME_MIGRATION: string[] = [];

/** Literals that pin a colour to one theme. */
const BANNED = /\b(?:bg-white|bg-gray-\d{2,3}|bg-slate-\d{2,3}|text-gray-\d{2,3}|text-slate-\d{2,3}|text-black|border-gray-\d{2,3}|border-slate-\d{2,3}|hover:bg-gray-\d{2,3}|text-green-\d{2,3}|bg-green-\d{2,3}|border-green-\d{2,3}|hover:bg-green-\d{2,3}|hover:text-green-\d{2,3}|divide-(?:gray|green|slate)-\d{2,3}|ring-(?:gray|green|slate)-\d{2,3}|outline-(?:gray|green|slate)-\d{2,3}|from-(?:gray|green|slate)-\d{2,3}|to-(?:gray|green|slate)-\d{2,3}|via-(?:gray|green|slate)-\d{2,3}|fill-(?:gray|green|slate)-\d{2,3}|stroke-(?:gray|green|slate)-\d{2,3})\b/g;

describe("theme migration", () => {
  for (const file of THEMED_FILES) {
    const pending = PENDING_THEME_MIGRATION.includes(file);
    it(`${file} ${pending ? "is pending migration" : "uses theme tokens only"}`, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      const found = [...new Set(source.match(BANNED) ?? [])];
      if (pending) return; // tracked, not yet migrated
      expect(found, `hardcoded colours left in ${file}: ${found.join(", ")}`).toEqual([]);
    });
  }

  it("discovers every file from the original scope", () => {
    // Guards against discovery silently shrinking, e.g. run from the wrong cwd.
    for (const file of ORIGINAL_SCOPE) expect(THEMED_FILES).toContain(file);
  });

  it("lists only real, discovered files as pending", () => {
    // A stale entry after a rename would otherwise exempt nothing and hide it.
    for (const file of PENDING_THEME_MIGRATION) expect(THEMED_FILES).toContain(file);
  });

  it("has no files left pending once migration completes", () => {
    expect(PENDING_THEME_MIGRATION).toEqual([]);
  });
});
