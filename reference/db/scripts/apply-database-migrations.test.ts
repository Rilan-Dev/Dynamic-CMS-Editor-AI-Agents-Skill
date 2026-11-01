import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyDatabaseMigrations,
  bootstrapSchemaFromPublic,
  loadDatabaseMigrations,
  qualifyMigrationSql,
  validateDatabaseSchema,
} from "./apply-database-migrations.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("database migration runner", () => {
  it("loads only versioned SQL migrations in lexical order", async () => {
    const directory = await mkdtemp(join(tmpdir(), "smts-migrations-"));
    temporaryDirectories.push(directory);
    await writeFile(join(directory, "202608010002_second.sql"), "SELECT 2;");
    await writeFile(join(directory, "202608010001_first.sql"), "SELECT 1;");
    await writeFile(join(directory, "README.md"), "ignored");

    await expect(loadDatabaseMigrations(directory)).resolves.toEqual([
      {
        id: "202608010001_first",
        sql: "SELECT 1;",
      },
      {
        id: "202608010002_second",
        sql: "SELECT 2;",
      },
    ]);
  });

  it("applies migrations under one transaction-scoped advisory lock", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const log = vi.fn();

    await applyDatabaseMigrations({
      client: { query },
      migrations: [
        { id: "202608010001_first", sql: "SELECT 1;" },
        { id: "202608010002_second", sql: "SELECT 2;" },
      ],
      schema: "smts_uat",
      log,
    });

    expect(query.mock.calls[0]).toEqual(["BEGIN"]);
    expect(query.mock.calls[1]).toEqual([
      "SELECT pg_advisory_xact_lock($1)",
      [736873821],
    ]);
    expect(query.mock.calls[2]).toEqual([
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS exists",
      ["smts_uat"],
    ]);
    expect(query.mock.calls[3]).toEqual(['CREATE SCHEMA IF NOT EXISTS "smts_uat"']);
    expect(query.mock.calls[4]).toEqual(["SELECT 1;"]);
    expect(query.mock.calls[5]).toEqual(["SELECT 2;"]);
    expect(query.mock.calls[6][0]).toContain("GRANT USAGE ON SCHEMA");
    expect(query.mock.calls[7]).toEqual(["COMMIT"]);
    expect(log.mock.calls).toEqual([
      ["Applying database migration 202608010001_first to schema smts_uat"],
      ["Applying database migration 202608010002_second to schema smts_uat"],
    ]);
  });

  it("does not auto-bootstrap production from public even when requested", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT EXISTS (SELECT 1 FROM pg_namespace")) {
        return { rows: [{ exists: false }] };
      }
      if (sql.includes("_environment_bootstrap WHERE key")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await applyDatabaseMigrations({
      client: { query },
      migrations: [{ id: "202608010001_first", sql: "SELECT 1;" }],
      schema: "smts_prod",
      bootstrapFromPublic: true,
    });

    expect(query.mock.calls.some(([sql]) => String(sql).includes("to_regclass('public.page_contents')"))).toBe(false);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("FROM public.page_contents"))).toBe(false);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("FROM public.leads"))).toBe(false);
  });

  it("rolls back the complete migration wave on failure", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error("migration failed"))
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      applyDatabaseMigrations({
        client: { query },
        migrations: [{ id: "202608010001_first", sql: "INVALID" }],
      }),
    ).rejects.toThrow("migration failed");

    expect(query).toHaveBeenLastCalledWith("ROLLBACK");
  });
});


describe("environment database schema", () => {
  it("rejects unsafe or missing schema identifiers", () => {
    expect(() => validateDatabaseSchema("smts_uat")).not.toThrow();
    expect(() => validateDatabaseSchema("public; DROP SCHEMA public")).toThrow(/DATABASE_SCHEMA/);
    expect(() => validateDatabaseSchema(undefined)).toThrow(/DATABASE_SCHEMA/);
  });

  it("rewrites migration table references and schema catalog checks", () => {
    expect(qualifyMigrationSql("CREATE TABLE public.leads (id int); SELECT 'public';", "smts_uat"))
      .toBe('CREATE TABLE "smts_uat".leads (id int); SELECT \'smts_uat\';');
  });
});


describe("initial schema data bootstrap", () => {
  it("copies initial CMS content and media but never customer leads into UAT", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ has_pages: true, has_media: true, has_leads: true }],
    });
    await bootstrapSchemaFromPublic({ query }, "smts_uat");
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1][0]).toContain('INSERT INTO "smts_uat".page_contents');
    expect(query.mock.calls[2][0]).toContain('INSERT INTO "smts_uat".media_assets');
    expect(query.mock.calls.some(([sql]) => String(sql).includes("FROM public.leads"))).toBe(false);
  });

  it("never copies legacy public content or leads into production", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ has_pages: true, has_media: true, has_leads: true }],
    });
    await bootstrapSchemaFromPublic({ query }, "smts_prod");
    expect(query).not.toHaveBeenCalled();
  });
});
