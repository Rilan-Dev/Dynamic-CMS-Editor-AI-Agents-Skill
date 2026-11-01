import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("lib/api/assets/route.ts", "utf8");
const workflow = readFileSync(".github/workflows/vercel-preview.yml", "utf8");

describe("upload failures tell the editor something useful", () => {
  it("separates a misconfigured environment from a genuine failure", () => {
    expect(route).toContain("Media storage is not configured for this environment.");
    expect(route).toContain("storage credentials are not permitted to write");
    expect(route).toContain("status: 503");
  });

  it("still logs the underlying detail for diagnosis", () => {
    expect(route).toContain('console.error("[assets] upload failed", detail)');
  });
});

describe("preview deployments use object storage", () => {
  it("does not ship the local driver to Vercel", () => {
    expect(workflow).toContain('ASSET_STORAGE_DRIVER: "supabase"');
    expect(workflow).not.toContain('ASSET_STORAGE_DRIVER: "local"');
  });
});
