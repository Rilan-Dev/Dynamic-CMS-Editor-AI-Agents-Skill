import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const sql = () => readFile(join(process.cwd(), "db/migrations/202610280002_cms_release_functions.sql"),"utf8");
describe("CMS release SQL", () => {
  it("exposes an atomic publish function with optimistic checks and immutability", async () => {
    const value = await sql();
    expect(value).toMatch(/CREATE OR REPLACE FUNCTION public\.cms_publish_release/i);
    expect(value).toMatch(/pg_advisory_xact_lock/i);
    expect(value).toMatch(/CMS_VERSION_CONFLICT/i);
    expect(value).toMatch(/INSERT INTO public\.cms_revisions/i);
    expect(value).toMatch(/INSERT INTO public\.cms_releases/i);
  });
  it("exposes a compare-and-swap draft RPC and restricted grants", async () => {
    const value = await sql();
    expect(value).toMatch(/CREATE OR REPLACE FUNCTION public\.cms_save_draft/i);
    expect(value).toMatch(/draft_revision = .*draft_revision \+ 1/i);
    expect(value).toMatch(/REVOKE ALL ON FUNCTION public\.cms_publish_release/i);
  });
});
