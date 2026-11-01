import { promises as fs } from "fs";
import path from "path";
import type { JsonObject } from "@/components/cms/json";
import { getPool } from "@/lib/server/db";
import { createSupabaseDatabase } from "@/lib/server/supabaseDatabase";
import { CmsVersionConflictError, isVersionConflict } from "@/lib/server/cmsRelease";

/**
 * CMS content store supporting optional Postgres and file fallback.
 */
export interface PageContentEntry {
  slug: string;
  draft: JsonObject | null;
  published: JsonObject | null;
  version: number;
  draftRevision: number;
  updatedAt: string;
  publishedAt: string | null;
}

const DATA_DIR = path.join(process.cwd(), ".cms-data");
const SLUG_RE = /^[a-z0-9-]+$/;

function fileFor(slug: string) {
  if (!SLUG_RE.test(slug)) throw new Error(`Invalid slug: ${slug}`);
  return path.join(DATA_DIR, `${slug}.json`);
}

function rowToEntry(row: any): PageContentEntry | null {
  if (!row) return null;
  return {
    slug: row.slug,
    draft: row.draft ?? null,
    published: row.published ?? null,
    version: row.version ?? 0,
    draftRevision: Number(row.draft_revision ?? row.draftRevision ?? 0),
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : new Date().toISOString(),
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
  };
}

async function dbGetEntry(slug: string): Promise<PageContentEntry | null> {
  const pool = await getPool();
  if (pool) {
    const result = await pool.query(
      `SELECT slug, draft, published, version, draft_revision, updated_at, published_at FROM page_contents WHERE slug = $1`,
      [slug],
    );
    return rowToEntry(result.rows[0]);
  }

  const supabase = createSupabaseDatabase();
  if (!supabase) return null;
  return rowToEntry(await supabase.getPage(slug));
}

export async function getEntry(slug: string): Promise<PageContentEntry | null> {
  if (!SLUG_RE.test(slug)) throw new Error(`Invalid slug: ${slug}`);
  const dbEntry = await dbGetEntry(slug);
  if (dbEntry) return dbEntry;

  try {
    const raw = await fs.readFile(fileFor(slug), "utf8");
    return JSON.parse(raw) as PageContentEntry;
  } catch {
    return null;
  }
}

/** Writes are conditional: stale browser tabs cannot overwrite another editor. */
export async function saveDraft(
  slug: string, draft: JsonObject, expectedVersion: number, expectedDraftRevision: number,
): Promise<PageContentEntry> {
  if (!SLUG_RE.test(slug) || !draft || typeof draft !== "object" || Array.isArray(draft)
      || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0
      || !Number.isSafeInteger(expectedDraftRevision) || expectedDraftRevision < 0) {
    throw new Error("Invalid draft preconditions");
  }
  try {
    const pool = await getPool();
    if (pool) {
      const result = await pool.query(
        "SELECT cms_save_draft($1, $2::jsonb, $3, $4) AS entry",
        [slug, JSON.stringify(draft), expectedVersion, expectedDraftRevision],
      );
      return rowToEntry(result.rows[0].entry)!;
    }
    const supabase = createSupabaseDatabase();
    if (!supabase) throw new Error("CMS draft saving requires configured database storage");
    return rowToEntry(await supabase.saveDraftCas(slug, draft, expectedVersion, expectedDraftRevision))!;
  } catch (error) {
    if (isVersionConflict(error)) throw new CmsVersionConflictError();
    throw error;
  }
}

export async function discardDraft(
  slug: string, expectedVersion: number, expectedDraftRevision: number,
): Promise<PageContentEntry> {
  if (!SLUG_RE.test(slug) || !Number.isSafeInteger(expectedVersion) || !Number.isSafeInteger(expectedDraftRevision))
    throw new Error("Invalid discard preconditions");
  try {
    const pool = await getPool();
    if (pool) {
      const result = await pool.query("SELECT cms_discard_draft($1, $2, $3) AS entry", [
        slug, expectedVersion, expectedDraftRevision,
      ]);
      return rowToEntry(result.rows[0].entry)!;
    }
    const supabase = createSupabaseDatabase();
    if (!supabase) throw new Error("CMS discard requires configured database storage");
    return rowToEntry(await supabase.discardDraftCas(slug, expectedVersion, expectedDraftRevision))!;
  } catch (error) {
    if (isVersionConflict(error)) throw new CmsVersionConflictError();
    throw error;
  }
}

const PREFIX_RE = /^[a-z0-9-]+$/;

/**
 * Every published document whose slug starts with `prefix`, in one read.
 * The blog listing uses it so post cards never have to be duplicated into
 * an index document. Unpublished documents are omitted.
 */
export async function listPublishedByPrefix(
  prefix: string,
): Promise<{ slug: string; published: JsonObject }[]> {
  if (!PREFIX_RE.test(prefix)) throw new Error(`Invalid prefix: ${prefix}`);

  const pool = await getPool();
  if (pool) {
    const result = await pool.query(
      `SELECT slug, published FROM page_contents
       WHERE slug LIKE $1 AND published IS NOT NULL
       ORDER BY slug`,
      [`${prefix}%`],
    );
    return (result.rows as { slug: string; published: JsonObject | null }[])
      .filter((row) => !!row.published)
      .map((row) => ({ slug: row.slug, published: row.published as JsonObject }));
  }

  const supabase = createSupabaseDatabase();
  if (supabase) {
    const rows = await supabase.listPublishedByPrefix(prefix);
    return rows
      .filter((row) => !!row.published)
      .map((row) => ({ slug: row.slug, published: row.published as JsonObject }));
  }

  try {
    const names = await fs.readdir(DATA_DIR);
    const entries = await Promise.all(
      names
        .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
        .map(async (name) => {
          const raw = await fs.readFile(path.join(DATA_DIR, name), "utf8");
          const entry = JSON.parse(raw) as PageContentEntry;
          return entry.published
            ? { slug: entry.slug, published: entry.published }
            : null;
        }),
    );
    return entries.filter(
      (entry): entry is { slug: string; published: JsonObject } => !!entry,
    );
  } catch {
    // No store is readable; the caller renders registry defaults instead.
    return [];
  }
}

export async function getPublished(slug: string): Promise<JsonObject | null> {
  const entry = await getEntry(slug);
  return entry?.published ?? null;
}
