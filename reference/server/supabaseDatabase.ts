import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getDatabaseSchema } from "@/lib/server/databaseSchema";

type Environment = Record<string, string | undefined>;
type SupabaseClientLike = {
  from(table: string): any;
  rpc?(functionName: string, args: Record<string, unknown>): Promise<{data: any; error: {code?: string; message?: string} | null}>;
};
type CreateClient = (
  url: string,
  key: string,
  options: {
    db: { schema: string };
    auth: { persistSession: boolean; autoRefreshToken: boolean };
  },
) => SupabaseClientLike;

export type SupabasePageRow = Record<string, unknown> & { slug: string };
export type SupabaseLeadRow = Record<string, unknown> & {
  name: string;
  email: string;
  phone: string | null;
  message: string;
  service: string;
  source: string;
  source_page: string;
};

export type SupabaseDatabase = {
  getPage(slug: string): Promise<SupabasePageRow | null>;
  listRevisions(slug: string, before: number | null, limit: number): Promise<Record<string, unknown>[]>;
  getRevision(slug: string, version: number): Promise<Record<string, unknown> | null>;
  saveDraftCas(slug: string, draft: Record<string, unknown>, expectedVersion: number, expectedDraftRevision: number): Promise<SupabasePageRow>;
  discardDraftCas(slug: string, expectedVersion: number, expectedDraftRevision: number): Promise<SupabasePageRow>;
  publishRelease(requestId: string, documents: unknown[]): Promise<unknown>;
  restoreRevision(input: { slug:string;sourceVersion:number;expectedVersion:number;expectedDraftRevision:number;mode:"draft"|"publish";requestId:string }): Promise<unknown>;
  putPage(page: SupabasePageRow): Promise<void>;
  insertLead(lead: SupabaseLeadRow): Promise<void>;
  listPublishedByPrefix(prefix: string): Promise<{ slug: string; published: Record<string, unknown> }[]>;
};

const defaultCreateClient: CreateClient = (url, key, options) =>
  createSupabaseClient(url, key, options) as unknown as SupabaseClientLike;

function storageError(operation: string, error: { message?: string }) {
  console.error(
    `[supabaseDatabase] ${operation} failed:`,
    error.message ?? "unknown provider error",
  );
  return new Error("Supabase content storage failed");
}

export function createSupabaseDatabase(
  env: Environment = process.env,
  createClient: CreateClient = defaultCreateClient,
): SupabaseDatabase | null {
  const url = env.SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;

  const schema = getDatabaseSchema(env);
  const client = createClient(url, secretKey, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async getPage(slug) {
      const { data, error } = await client
        .from("page_contents")
        .select("slug, draft, published, version, draft_revision, updated_at, published_at")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw storageError("page read", error);
      return data as SupabasePageRow | null;
    },
    async listRevisions(slug, before, limit) {
      let query = client.from("cms_revisions")
        .select("slug,version,action,published_at,release_id,restored_from_version")
        .eq("slug", slug)
        .order("version", { ascending: false });
      if (before !== null) query = query.lt("version",before);
      const {data,error} = await query.limit(limit);
      if (error) throw storageError("history list",error);
      return (data ?? []) as Record<string, unknown>[];
    },
    async getRevision(slug, version) {
      const {data,error} = await client.from("cms_revisions")
        .select("slug,version,action,published_at,release_id,restored_from_version,snapshot")
        .eq("slug",slug).eq("version",version).maybeSingle();
      if (error) throw storageError("history snapshot",error);
      return data as Record<string, unknown> | null;
    },
    async saveDraftCas(slug, draft, expectedVersion, expectedDraftRevision) {
      const { data, error } = await client.rpc!("cms_save_draft", {
        p_slug: slug, p_draft: draft, p_expected_version: expectedVersion,
        p_expected_draft_revision: expectedDraftRevision,
      });
      if (error) {
        if (error.code === "40001" || error.message?.includes("CMS_VERSION_CONFLICT")) throw Object.assign(new Error("CMS_VERSION_CONFLICT"), { code: "40001" });
        throw storageError("draft write", error);
      }
      return data as SupabasePageRow;
    },
    async discardDraftCas(slug, expectedVersion, expectedDraftRevision) {
      const { data, error } = await client.rpc!("cms_discard_draft", {
        p_slug: slug, p_expected_version: expectedVersion, p_expected_draft_revision: expectedDraftRevision,
      });
      if (error) {
        if (error.code === "40001" || error.message?.includes("CMS_VERSION_CONFLICT")) throw Object.assign(new Error("CMS_VERSION_CONFLICT"), { code: "40001" });
        throw storageError("draft discard", error);
      }
      return data as SupabasePageRow;
    },
    async restoreRevision(input) {
      const {data,error}=await client.rpc!("cms_restore_revision",{
        p_slug:input.slug,p_source_version:input.sourceVersion,
        p_expected_version:input.expectedVersion,
        p_expected_draft_revision:input.expectedDraftRevision,
        p_mode:input.mode,p_request_id:input.requestId,
      });
      if(error){
        if (error.code==="40001" || error.message?.includes("CMS_VERSION_CONFLICT"))
          throw Object.assign(new Error("CMS_VERSION_CONFLICT"),{code:"40001"});
        if (error.code==="P0002" || error.message?.includes("CMS_SOURCE_NOT_FOUND"))
          throw Object.assign(new Error("CMS_SOURCE_NOT_FOUND"),{code:"P0002"});
        throw storageError("restore version",error);
      }
      return data;
    },
    async publishRelease(requestId, documents) {
      const { data, error } = await client.rpc!("cms_publish_release", {
        p_request_id: requestId, p_documents: documents,
      });
      if (error) {
        if (error.code === "40001" || error.message?.includes("CMS_VERSION_CONFLICT")) throw Object.assign(new Error("CMS_VERSION_CONFLICT"), { code: "40001" });
        throw storageError("release", error);
      }
      return data;
    },
    async putPage(page) {
      const { error } = await client.from("page_contents").upsert(page, { onConflict: "slug" });
      if (error) throw storageError("page write", error);
    },
    async listPublishedByPrefix(prefix) {
      const { data, error } = await client
        .from("page_contents")
        .select("slug, published")
        .like("slug", `${prefix}%`)
        .not("published", "is", null);
      if (error) throw storageError("page list", error);
      return (data ?? []) as { slug: string; published: Record<string, unknown> }[];
    },
    async insertLead(lead) {
      const { error } = await client.from("leads").insert(lead);
      if (error) throw storageError("lead write", error);
    },
  };
}
