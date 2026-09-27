import { promises as fs } from "fs";
import path from "path";
import type { JsonObject } from "@/components/cms/json";
import { getPool } from "@/lib/server/db";
import { createSupabaseDatabase } from "@/lib/server/supabaseDatabase";

/**
 * CMS content store supporting optional Postgres and file fallback.
 */
export interface PageContentEntry {
  slug: string;
  draft: JsonObject | null;
  published: JsonObject | null;
  version: number;
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
      `SELECT slug, draft, published, version, updated_at, published_at FROM page_contents WHERE slug = $1`,
      [slug],
    );
    return rowToEntry(result.rows[0]);
  }

  const supabase = createSupabaseDatabase();
  if (!supabase) return null;
  return rowToEntry(await supabase.getPage(slug));
}

async function dbWriteEntry(entry: PageContentEntry): Promise<boolean> {
  const pool = await getPool();
  if (pool) {
    await pool.query(
      `INSERT INTO page_contents (slug, draft, published, version, updated_at, published_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET
         draft = EXCLUDED.draft,
         published = EXCLUDED.published,
         version = EXCLUDED.version,
         updated_at = EXCLUDED.updated_at,
         published_at = EXCLUDED.published_at`,
      [
        entry.slug,
        entry.draft,
        entry.published,
        entry.version,
        entry.updatedAt,
        entry.publishedAt,
      ],
    );
    return true;
  }

  const supabase = createSupabaseDatabase();
  if (!supabase) return false;
  await supabase.putPage({
    slug: entry.slug,
    draft: entry.draft,
    published: entry.published,
    version: entry.version,
    updated_at: entry.updatedAt,
    published_at: entry.publishedAt,
  });
  return true;
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

async function writeEntry(entry: PageContentEntry): Promise<void> {
  if (await dbWriteEntry(entry)) return;

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    fileFor(entry.slug),
    JSON.stringify(entry, null, 2),
    "utf8",
  );
}

export async function saveDraft(
  slug: string,
  draft: JsonObject,
): Promise<PageContentEntry> {
  const existing = await getEntry(slug);
  const entry: PageContentEntry = {
    slug,
    draft,
    published: existing?.published ?? null,
    version: existing?.version ?? 0,
    updatedAt: new Date().toISOString(),
    publishedAt: existing?.publishedAt ?? null,
  };
  await writeEntry(entry);
  return entry;
}

export async function publish(slug: string): Promise<PageContentEntry | null> {
  const existing = await getEntry(slug);
  if (!existing?.draft) return existing;
  const entry: PageContentEntry = {
    ...existing,
    published: existing.draft,
    version: existing.version + 1,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeEntry(entry);
  return entry;
}

export async function discardDraft(
  slug: string,
): Promise<PageContentEntry | null> {
  const existing = await getEntry(slug);
  if (!existing) return null;
  const entry: PageContentEntry = {
    ...existing,
    draft: existing.published,
    updatedAt: new Date().toISOString(),
  };
  await writeEntry(entry);
  return entry;
}

export async function getPublished(slug: string): Promise<JsonObject | null> {
  const entry = await getEntry(slug);
  return entry?.published ?? null;
}
