import type { JsonObject } from "@/components/cms/json";
import { getPool } from "@/lib/server/db";
import { createSupabaseDatabase } from "@/lib/server/supabaseDatabase";

const SLUG_RE = /^[a-z0-9-]+$/;
const HISTORY_PAGE_SIZE = 20;

export interface CmsVersionSummary {
  slug: string;
  version: number;
  action: "baseline" | "publish" | "rollback";
  publishedAt: string;
  releaseId: string | null;
  isCurrent: boolean;
  restoredFromVersion?: number | null;
}
export interface CmsHistoryPage {
  items: CmsVersionSummary[];
  nextBefore: number | null;
  currentVersion: number;
}
export interface CmsHistorySnapshot {
  revision: CmsVersionSummary;
  snapshot: JsonObject;
}

export interface CmsHistoryRow {
  slug: string;
  version: number;
  action: "baseline" | "publish" | "rollback";
  published_at: string | Date;
  release_id: string | null;
  snapshot?: JsonObject;
  current_version?: number | null;
  restored_from_version?: number | null;
}
export class CmsHistoryUnavailableError extends Error {
  constructor() { super("CMS version history requires configured persistent storage"); }
}

function validSlug(slug: string) {
  if (!SLUG_RE.test(slug)) throw new Error("Invalid CMS document slug");
}
function validVersion(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid CMS version");
}
function asSummary(row: CmsHistoryRow, live: number): CmsVersionSummary {
  return {
    slug: row.slug,
    version: Number(row.version),
    action: row.action,
    publishedAt: new Date(row.published_at).toISOString(),
    releaseId: row.release_id ?? null,
    isCurrent: Number(row.version) === live,
    restoredFromVersion: row.restored_from_version ?? null,
  };
}
async function storage() {
  const pool = await getPool();
  if (pool) return { pool, supabase: null };
  const supabase = createSupabaseDatabase();
  if (supabase) return {pool:null,supabase};
  throw new CmsHistoryUnavailableError();
}

/** Keyset paging keeps navigation stable when new versions are published. */
export async function listCmsVersions(slug: string, before: number | null = null): Promise<CmsHistoryPage> {
  validSlug(slug);
  if (before !== null) validVersion(before);
  const {pool,supabase} = await storage();
  let currentVersion = 0;
  let rows: CmsHistoryRow[] = [];
  if (pool) {
    const current = await pool.query("SELECT version FROM page_contents WHERE slug = $1", [slug]);
    currentVersion = Number(current.rows[0]?.version ?? 0);
    const result = await pool.query(
      `SELECT r.slug, r.version, r.action, r.published_at, r.release_id, r.restored_from_version
       FROM cms_revisions r
       WHERE r.slug = $1 AND ($2::integer IS NULL OR r.version < $2)
       ORDER BY r.version DESC LIMIT $3`,
      [slug, before, HISTORY_PAGE_SIZE + 1],
    );
    rows = result.rows as CmsHistoryRow[];
  } else if (supabase) {
    const [page, revisionRows] = await Promise.all([
      supabase.getPage(slug),
      supabase.listRevisions(slug, before, HISTORY_PAGE_SIZE + 1),
    ]);
    currentVersion = Number(page?.version ?? 0);
    rows = revisionRows as unknown as CmsHistoryRow[];
  }
  const more = rows.length > HISTORY_PAGE_SIZE;
  const items = rows.slice(0,HISTORY_PAGE_SIZE).map((row)=>asSummary(row,currentVersion));
  return {
    items,
    currentVersion,
    nextBefore: more ? items[items.length-1].version : null,
  };
}

/** Fetches exactly one immutable snapshot; never returns live draft data. */
export async function getCmsVersion(slug: string, version: number): Promise<CmsHistorySnapshot | null> {
  validSlug(slug); validVersion(version);
  const {pool,supabase} = await storage();
  let row: CmsHistoryRow | null = null;
  if (pool) {
    const result = await pool.query(
      `SELECT r.slug, r.version, r.action, r.published_at, r.release_id,
              r.restored_from_version, r.snapshot, c.version AS current_version
       FROM cms_revisions r JOIN page_contents c ON c.slug = r.slug
       WHERE r.slug = $1 AND r.version = $2`,
      [slug,version],
    );
    row = (result.rows[0] as CmsHistoryRow | undefined) ?? null;
  } else if(supabase) {
    const [found, page] = await Promise.all([
      supabase.getRevision(slug,version),
      supabase.getPage(slug),
    ]);
    if (found) row = {...(found as unknown as CmsHistoryRow), current_version:Number(page?.version ?? 0)};
  }
  if (!row?.snapshot) return null;
  return {
    revision: asSummary(row,Number(row.current_version ?? 0)),
    snapshot: row.snapshot,
  };
}
