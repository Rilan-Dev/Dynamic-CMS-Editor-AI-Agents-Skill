import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { applyDatabaseMigrations, loadDatabaseMigrations } from "./apply-database-migrations.mjs";

const NAME = "202610280001_cms_revision_history";

async function revisionSql(): Promise<string> {
  return readFile(join(process.cwd(), "db/migrations", NAME + ".sql"), "utf8");
}

describe("CMS revision history migration", () => {
  it("registers the revision migration in the normal schema-scoped migration runner", async () => {
    const migrations = await loadDatabaseMigrations();
    expect(migrations.some((migration: { id: string }) => migration.id === NAME)).toBe(true);
  });

  it("adds an optimistic draft revision without replacing existing page data", async () => {
    const sql = await revisionSql();
    expect(sql).toMatch(/ALTER TABLE(?: IF EXISTS)? (?:public\.)?page_contents/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS draft_revision\s+BIGINT\s+NOT NULL\s+DEFAULT\s+0/i);
    expect(sql).not.toMatch(/TRUNCATE\s+page_contents|DROP\s+TABLE\s+page_contents/i);
  });

  it("stores an immutable full JSON snapshot and a stable version identity", async () => {
    const sql = await revisionSql();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS (?:public\.)?cms_revisions/i);
    expect(sql).toMatch(/snapshot\s+JSONB\s+NOT NULL/i);
    expect(sql).toMatch(/PRIMARY KEY\s*\(slug,\s*version\)/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS (?:public\.)?cms_releases/i);
    expect(sql).toMatch(/request_id\s+UUID\s+NOT NULL\s+UNIQUE/i);
  });

  it("backfills already published documents idempotently without incrementing their versions", async () => {
    const sql = await revisionSql();
    expect(sql).toMatch(/INSERT INTO (?:public\.)?cms_revisions/i);
    expect(sql).toMatch(/FROM (?:public\.)?page_contents/i);
    expect(sql).toMatch(/WHERE published IS NOT NULL/i);
    expect(sql).toMatch(/ON CONFLICT\s*\(slug,\s*version\)\s*DO NOTHING/i);
    expect(sql).not.toMatch(/UPDATE page_contents SET version/i);
  });

  it("does not grant the revision archive to anonymous or authenticated browser users", async () => {
    const sql = await revisionSql();
    expect(sql).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.cms_revisions FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.cms_revisions FROM anon/i);
    expect(sql).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.cms_releases FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.cms_releases FROM authenticated/i);
  });
  it("backfills a newly bootstrapped environment after importing its legacy public pages", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT EXISTS (SELECT 1 FROM pg_namespace")) {
        return { rows: [{ exists: false }] };
      }
      if (sql.includes("_environment_bootstrap WHERE key")) {
        return { rows: [] };
      }
      if (sql.includes("to_regclass('public.page_contents')")) {
        return { rows: [{ has_pages: true, has_media: false, has_leads: false }] };
      }
      return { rows: [] };
    });
    await applyDatabaseMigrations({
      client: { query },
      migrations: [{ id: NAME, sql: "SELECT 1;" }],
      schema: "smts_uat",
      bootstrapFromPublic: true,
      log: () => {},
    });
    const statements = query.mock.calls.map(([sql]) => String(sql));
    const importAt = statements.findIndex((sql) =>
      sql.includes('INSERT INTO "smts_uat".page_contents'),
    );
    const snapshotAt = statements.findIndex((sql) =>
      sql.includes('INSERT INTO "smts_uat".cms_revisions'),
    );
    expect(importAt).toBeGreaterThan(-1);
    expect(snapshotAt).toBeGreaterThan(importAt);
    expect(statements[snapshotAt]).toContain("ON CONFLICT (slug, version) DO NOTHING");
  });

});
