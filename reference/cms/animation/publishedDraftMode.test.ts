import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("keeps draft and published documents in separate store collections", () => {
  const source = readFileSync(resolve(process.cwd(), "components/cms/store.ts"), "utf8");
  expect(source).toContain('viewMode: "draft"');
  expect(source).toContain("publishedDocs:");
  expect(source).toContain("getRenderableDoc");
  expect(source).toContain('state.viewMode === "published"');
  expect(source).toContain("state.docs[slug]");
});

it("keeps publish as an explicit operation", () => {
  const source = readFileSync(resolve(process.cwd(), "components/cms/store.ts"), "utf8");
  expect(source).toContain("export async function publishDraft");
  expect(source).toContain("await CmsService.publish(slug)");
  expect(source).not.toContain("publishDraft();\n  scheduleSave");
});
