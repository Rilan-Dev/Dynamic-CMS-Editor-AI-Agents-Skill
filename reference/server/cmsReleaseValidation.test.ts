import { beforeEach, describe, expect, it, vi } from "vitest";
const { getEntry } = vi.hoisted(() => ({ getEntry: vi.fn() }));
vi.mock("@/lib/server/contentStore", () => ({ getEntry }));
import { validateReleaseDocuments } from "./cmsReleaseValidation";

beforeEach(() => getEntry.mockResolvedValue(null));

describe("real server-side CMS release validation", () => {
  it("rejects unsafe URLs supplied directly to the release endpoint", async () => {
    const issues = await validateReleaseDocuments([{
      slug: "site", expectedVersion: 0, expectedDraftRevision: 0,
      document: { navbar: { links: [{ id: "bad", name: "Unsafe", href: "javascript:alert(1)" }] } },
    }]);
    expect(issues.some((issue) => issue.code === "unsafe-url" && issue.document === "site")).toBe(true);
  });

  it("blocks unsafe references in a related page rather than trusting the browser", async () => {
    const issues = await validateReleaseDocuments([{
      slug: "about", expectedVersion: 0, expectedDraftRevision: 0,
      document: { cta: { buttonHref: "javascript:alert(1)" } },
    }]);
    expect(issues.some((issue) => issue.code === "unsafe-url")).toBe(true);
  });
});
