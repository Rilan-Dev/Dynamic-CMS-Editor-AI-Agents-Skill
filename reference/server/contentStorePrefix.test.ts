import { afterEach, describe, expect, it, vi } from "vitest";

const { getPool, createSupabaseDatabase, readdir, readFile } = vi.hoisted(() => ({
  getPool: vi.fn(),
  createSupabaseDatabase: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({ getPool, query: vi.fn(), saveLead: vi.fn() }));
vi.mock("@/lib/server/supabaseDatabase", () => ({ createSupabaseDatabase }));
vi.mock("fs", () => ({
  promises: { readdir, readFile, mkdir: vi.fn(), writeFile: vi.fn() },
}));

import { listPublishedByPrefix } from "./contentStore";

afterEach(() => vi.resetAllMocks());

describe("listPublishedByPrefix", () => {
  it("reads every matching document in one Postgres query", async () => {
    getPool.mockResolvedValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          { slug: "blog-a", published: { title: "A" } },
          { slug: "blog-b", published: { title: "B" } },
        ],
      }),
    });

    await expect(listPublishedByPrefix("blog-")).resolves.toEqual([
      { slug: "blog-a", published: { title: "A" } },
      { slug: "blog-b", published: { title: "B" } },
    ]);
  });

  it("skips documents that have never been published", async () => {
    getPool.mockResolvedValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          { slug: "blog-a", published: null },
          { slug: "blog-b", published: { title: "B" } },
        ],
      }),
    });

    await expect(listPublishedByPrefix("blog-")).resolves.toEqual([
      { slug: "blog-b", published: { title: "B" } },
    ]);
  });

  it("falls back to Supabase when there is no pool", async () => {
    getPool.mockResolvedValue(null);
    createSupabaseDatabase.mockReturnValue({
      listPublishedByPrefix: vi
        .fn()
        .mockResolvedValue([{ slug: "blog-a", published: { title: "A" } }]),
    });

    await expect(listPublishedByPrefix("blog-")).resolves.toEqual([
      { slug: "blog-a", published: { title: "A" } },
    ]);
  });

  it("falls back to the .cms-data directory when nothing else is configured", async () => {
    getPool.mockResolvedValue(null);
    createSupabaseDatabase.mockReturnValue(null);
    readdir.mockResolvedValue(["blog-a.json", "site.json", "notes.txt"]);
    readFile.mockResolvedValue(
      JSON.stringify({ slug: "blog-a", published: { title: "A" } }),
    );

    await expect(listPublishedByPrefix("blog-")).resolves.toEqual([
      { slug: "blog-a", published: { title: "A" } },
    ]);
  });

  it("returns an empty list rather than throwing when no store is readable", async () => {
    getPool.mockResolvedValue(null);
    createSupabaseDatabase.mockReturnValue(null);
    readdir.mockRejectedValue(new Error("ENOENT"));

    await expect(listPublishedByPrefix("blog-")).resolves.toEqual([]);
  });

  it("rejects a prefix that could escape the slug rules", async () => {
    await expect(listPublishedByPrefix("blog_%")).rejects.toThrow(/Invalid prefix/);
  });
});
