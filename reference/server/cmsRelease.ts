import type { JsonObject } from "@/components/cms/json";
import { getPool } from "@/lib/server/db";
import { createSupabaseDatabase } from "@/lib/server/supabaseDatabase";

export interface CmsReleaseDocument {
  slug: string;
  expectedVersion: number;
  expectedDraftRevision: number;
  document: JsonObject;
}
export interface CmsReleaseRequest {
  requestId: string;
  documents: CmsReleaseDocument[];
}
export interface CmsReleaseResult {
  releaseId: string | null;
  documents: { slug: string; version: number; draftRevision: number }[];
  changed?: number;
}

export class CmsVersionConflictError extends Error {
  constructor() { super("Another editor changed this content. Reload the draft and review your changes."); }
}
export const isVersionConflict = (error: unknown): boolean => {
  const value = error as { code?: string; message?: string };
  return value?.code === "40001" || value?.message?.includes("CMS_VERSION_CONFLICT") === true;
};

export function checkReleaseRequest(input: CmsReleaseRequest): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)
    || !Array.isArray(input.documents) || input.documents.length === 0 || input.documents.length > 25) {
    throw new Error("Invalid CMS release request");
  }
  const slugs = new Set<string>();
  for (const doc of input.documents) {
    if (!doc || typeof doc.slug !== "string" || !/^[a-z0-9-]+$/.test(doc.slug)
      || slugs.has(doc.slug) || !doc.document || typeof doc.document !== "object"
      || Array.isArray(doc.document) || !Number.isSafeInteger(doc.expectedVersion)
      || doc.expectedVersion < 0 || !Number.isSafeInteger(doc.expectedDraftRevision)
      || doc.expectedDraftRevision < 0) throw new Error("Invalid CMS release document");
    slugs.add(doc.slug);
  }
}
export async function publishCmsRelease(input: CmsReleaseRequest): Promise<CmsReleaseResult> {
  checkReleaseRequest(input);
  try {
    const pool = await getPool();
    if (pool) {
      const rows = await pool.query("SELECT cms_publish_release($1::uuid, $2::jsonb) AS result", [
        input.requestId, JSON.stringify(input.documents),
      ]);
      return rows.rows[0].result as CmsReleaseResult;
    }
    const supabase = createSupabaseDatabase();
    if (!supabase) throw new Error("Atomic publishing requires PostgreSQL or Supabase configuration");
    return await supabase.publishRelease(input.requestId, input.documents) as CmsReleaseResult;
  } catch (error) {
    if (isVersionConflict(error)) throw new CmsVersionConflictError();
    throw error;
  }
}
