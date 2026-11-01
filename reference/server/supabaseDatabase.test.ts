import { describe, expect, it, vi } from "vitest";
import { createSupabaseDatabase } from "./supabaseDatabase";

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "server-secret",
  DATABASE_SCHEMA: "smts_uat",
};

describe("createSupabaseDatabase", () => {
  it("returns null when hosted Supabase is not configured", () => {
    const factory = vi.fn();

    expect(createSupabaseDatabase({}, factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it("reads one page through the server-only Supabase client", async () => {
    const row = { slug: "home", version: 2 };
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) };
    const factory = vi.fn(() => client);

    const database = createSupabaseDatabase(env, factory);

    await expect(database?.getPage("home")).resolves.toEqual(row);
    expect(factory).toHaveBeenCalledWith(
      env.SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
      expect.objectContaining({
        db: { schema: "smts_uat" },
        auth: expect.objectContaining({ persistSession: false }),
      }),
    );
    expect(client.from).toHaveBeenCalledWith("page_contents");
    expect(eq).toHaveBeenCalledWith("slug", "home");
  });

  it("upserts page content and inserts leads", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn((table: string) =>
        table === "page_contents" ? { upsert } : { insert },
      ),
    };
    const database = createSupabaseDatabase(env, () => client);
    const page = { slug: "home", version: 1 };
    const lead = {
      name: "Client",
      email: "client@example.com",
      phone: null,
      message: "Quote request",
      service: "building-contracting",
      source: "contact-form",
      source_page: "/contact",
    };

    await database?.putPage(page);
    await database?.insertLead(lead);

    expect(upsert).toHaveBeenCalledWith(page, { onConflict: "slug" });
    expect(insert).toHaveBeenCalledWith({
      name: "Client",
      email: "client@example.com",
      phone: null,
      message: "Quote request",
      service: "building-contracting",
      source: "contact-form",
      source_page: "/contact",
    });
  });

  it("returns generic storage errors instead of provider details", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "relation page_contents does not exist" },
    });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    };
    const database = createSupabaseDatabase(env, () => client);

    await expect(database?.getPage("home")).rejects.toThrow(
      "Supabase content storage failed",
    );
  });
  it("reads a service-role history page with cursor ordering in the active schema", async () => {
    const row = {slug:"about",version:3,action:"publish",published_at:"2026-10-27T12:00:00Z",release_id:null};
    const limit = vi.fn().mockResolvedValue({data:[row],error:null});
    const lt = vi.fn(()=>({limit}));
    const order = vi.fn(()=>({lt,limit}));
    const eq = vi.fn(()=>({order}));
    const select = vi.fn(()=>({eq}));
    const client = { from: vi.fn(()=>({select})) };
    const db = createSupabaseDatabase(env, ()=>client);
    await expect(db?.listRevisions("about",4,21)).resolves.toEqual([row]);
    expect(client.from).toHaveBeenCalledWith("cms_revisions");
    expect(eq).toHaveBeenCalledWith("slug","about");
    expect(lt).toHaveBeenCalledWith("version",4);
    expect(order).toHaveBeenCalledWith("version",{ascending:false});
    expect(limit).toHaveBeenCalledWith(21);
  });

  it("reads exactly one historical snapshot by both slug and version", async () => {
    const row = {slug:"about",version:1,snapshot:{hero:{title:"Old"}}};
    const maybeSingle = vi.fn().mockResolvedValue({data:row,error:null});
    const eq = vi.fn().mockReturnThis();
    const builder = {eq,maybeSingle};
    const select = vi.fn((_fields:string)=>builder);
    const client = { from: vi.fn(()=>({select})) };
    const db = createSupabaseDatabase(env,()=>client);
    await expect(db?.getRevision("about",1)).resolves.toEqual(row);
    expect(eq).toHaveBeenCalledWith("slug","about");
    expect(eq).toHaveBeenCalledWith("version",1);
    expect(select.mock.calls[0][0]).toContain("snapshot");
  });

});
