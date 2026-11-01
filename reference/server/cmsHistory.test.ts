import { beforeEach, describe, expect, it, vi } from "vitest";
const { getPool, createSupabaseDatabase } = vi.hoisted(() => ({
  getPool: vi.fn(), createSupabaseDatabase: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ getPool }));
vi.mock("@/lib/server/supabaseDatabase", () => ({ createSupabaseDatabase }));
import { listCmsVersions, getCmsVersion, CmsHistoryUnavailableError } from "./cmsHistory";
const row = (version: number) => ({
  slug:"about",version,action:"publish",release_id:"release-1",
  published_at:"2026-10-27T12:00:00.000Z",
  snapshot:{hero:{title:"Hello"}},
});
beforeEach(() => { vi.resetAllMocks(); });
describe("CMS read-only publication history", () => {
  it("reads newest 20 versions, exposes a version cursor, and never fetches snapshots in the list", async () => {
    const rows = Array.from({length:21},(_,i)=>row(30-i));
    const query = vi.fn().mockResolvedValueOnce({ rows:[{version:30}] })
      .mockResolvedValueOnce({rows});
    getPool.mockResolvedValue({query});
    const page = await listCmsVersions("about");
    expect(page.items).toHaveLength(20);
    expect(page.currentVersion).toBe(30);
    expect(page.items[0].isCurrent).toBe(true);
    expect(page.nextBefore).toBe(11);
    expect(query.mock.calls[1][0]).toContain("version < $2");
    expect(query.mock.calls[1][1]).toEqual(["about", null, 21]);
    expect(query.mock.calls[1][0]).not.toContain("snapshot");
  });
  it("can page past a baseline version zero without repeating current rows", async () => {
    getPool.mockResolvedValue({query:vi.fn()
      .mockResolvedValueOnce({rows:[{version:20}]})
      .mockResolvedValueOnce({rows:[row(1),{...row(0),action:"baseline"}]})});
    const data = await listCmsVersions("about", 2);
    expect(data.items.map((x)=>x.version)).toEqual([1,0]);
    expect(data.nextBefore).toBeNull();
  });
  it("loads a single immutable snapshot only on demand", async () => {
    getPool.mockResolvedValue({ query:vi.fn().mockResolvedValue({rows:[{...row(4),current_version:9}]}) });
    const version = await getCmsVersion("about",4);
    expect(version?.revision.version).toBe(4);
    expect(version?.revision.isCurrent).toBe(false);
    expect(version?.snapshot.hero).toEqual({title:"Hello"});
  });
  it("supports Supabase service-role history reads when PG is unavailable", async () => {
    getPool.mockResolvedValue(null);
    createSupabaseDatabase.mockReturnValue({
      getPage:vi.fn().mockResolvedValue({version:2}),
      listRevisions:vi.fn().mockResolvedValue([row(2),row(1)]),
      getRevision:vi.fn().mockResolvedValue(row(1)),
    });
    const page = await listCmsVersions("about");
    expect(page.items[0].isCurrent).toBe(true);
    expect((await getCmsVersion("about",1))?.snapshot.hero).toEqual({title:"Hello"});
  });
  it("fails closed when no durable version-history storage exists", async () => {
    getPool.mockResolvedValue(null);
    createSupabaseDatabase.mockReturnValue(null);
    await expect(listCmsVersions("about")).rejects.toBeInstanceOf(CmsHistoryUnavailableError);
    await expect(getCmsVersion("about",1)).rejects.toBeInstanceOf(CmsHistoryUnavailableError);
  });
  it("rejects slugs and versions before any database request", async () => {
    await expect(listCmsVersions("../secret")).rejects.toThrow("Invalid");
    await expect(getCmsVersion("about",-1)).rejects.toThrow("Invalid");
    expect(getPool).not.toHaveBeenCalled();
  });
});
