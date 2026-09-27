import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type Environment = Record<string, string | undefined>;
type SupabaseClientLike = {
  from(table: string): any;
};
type CreateClient = (
  url: string,
  key: string,
  options: {
    auth: { persistSession: boolean; autoRefreshToken: boolean };
  },
) => SupabaseClientLike;

export type SupabasePageRow = Record<string, unknown> & { slug: string };
export type SupabaseLeadRow = Record<string, unknown> & {
  name: string;
  email: string;
  message: string;
};

export type SupabaseDatabase = {
  getPage(slug: string): Promise<SupabasePageRow | null>;
  putPage(page: SupabasePageRow): Promise<void>;
  insertLead(lead: SupabaseLeadRow): Promise<void>;
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

  const client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async getPage(slug) {
      const { data, error } = await client
        .from("page_contents")
        .select("slug, draft, published, version, updated_at, published_at")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw storageError("page read", error);
      return data as SupabasePageRow | null;
    },

    async putPage(page) {
      const { error } = await client
        .from("page_contents")
        .upsert(page, { onConflict: "slug" });
      if (error) throw storageError("page write", error);
    },

    async insertLead(lead) {
      const { error } = await client.from("leads").insert(lead);
      if (error) throw storageError("lead write", error);
    },
  };
}
