import type { JsonObject } from "@/components/cms/json";
import { getPool } from "@/lib/server/db";
import { createSupabaseDatabase } from "@/lib/server/supabaseDatabase";
import { isVersionConflict } from "@/lib/server/cmsRelease";

const SLUG_RE=/^[a-z0-9-]+$/;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CmsRestoreMode="draft"|"publish";
export interface CmsRestoreRequest {
  slug:string; sourceVersion:number; expectedVersion:number;
  expectedDraftRevision:number; mode:CmsRestoreMode; requestId:string;
}
export interface CmsRestoreResult {
  slug:string; mode:CmsRestoreMode; releaseId:string|null;
  version:number; draftRevision:number; restoredFromVersion:number;
  changed:boolean; snapshot:JsonObject;
}
export class CmsRestoreConflictError extends Error {
  constructor() { super("Another editor changed this content. Refresh the page and review the new draft before restoring."); }
}
export class CmsRestoreNotFoundError extends Error {
  constructor() { super("This saved version is no longer available."); }
}
export function checkRestoreRequest(input:CmsRestoreRequest):void {
  if (!input || typeof input.slug!=="string" || !SLUG_RE.test(input.slug)
    || !Number.isSafeInteger(input.sourceVersion) || input.sourceVersion<0
    || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion<0
    || !Number.isSafeInteger(input.expectedDraftRevision) || input.expectedDraftRevision<0
    || !["draft","publish"].includes(input.mode) || !UUID_RE.test(input.requestId))
    throw new Error("Invalid CMS restore preconditions");
}
export async function restoreCmsRevision(input:CmsRestoreRequest):Promise<CmsRestoreResult> {
  checkRestoreRequest(input);
  try {
    const pool=await getPool();
    if(pool) {
      const result=await pool.query(
        "SELECT cms_restore_revision($1,$2,$3,$4,$5,$6::uuid) AS result",
        [input.slug,input.sourceVersion,input.expectedVersion,input.expectedDraftRevision,input.mode,input.requestId],
      );
      return result.rows[0].result as CmsRestoreResult;
    }
    const supabase=createSupabaseDatabase();
    if (!supabase) throw new Error("CMS restoration requires durable database storage");
    return await supabase.restoreRevision(input) as CmsRestoreResult;
  } catch(error) {
    const cause=error as {code?:string;message?:string};
    if (isVersionConflict(error)) throw new CmsRestoreConflictError();
    if (cause?.code==="P0002" || cause?.message?.includes("CMS_SOURCE_NOT_FOUND"))
      throw new CmsRestoreNotFoundError();
    throw error;
  }
}
