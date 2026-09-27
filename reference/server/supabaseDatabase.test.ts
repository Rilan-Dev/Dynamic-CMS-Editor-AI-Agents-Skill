import { describe, expect, it, vi } from "vitest";
import { createSupabaseDatabase } from "./supabaseDatabase";

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "server-secret",
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
    const lead = { name: "A", email: "a@example.com", message: "Hello" };

    await database?.putPage(page);
    await database?.insertLead(lead);

    expect(upsert).toHaveBeenCalledWith(page, { onConflict: "slug" });
    expect(insert).toHaveBeenCalledWith(lead);
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
});
