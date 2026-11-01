import { beforeEach, describe, expect, it, vi } from "vitest";
const { getPool, createSupabaseDatabase } = vi.hoisted(()=>({getPool:vi.fn(),createSupabaseDatabase:vi.fn()}));
vi.mock("@/lib/server/db",()=>({getPool}));
vi.mock("@/lib/server/supabaseDatabase",()=>({createSupabaseDatabase}));
import { restoreCmsRevision, checkRestoreRequest, CmsRestoreConflictError } from "./cmsRestore";
const input={ slug:"about",sourceVersion:2,expectedVersion:6,expectedDraftRevision:9,
 mode:"draft" as const,requestId:"7c0f4581-1e23-4b39-862d-9bbf2dc19701" };
beforeEach(()=>vi.resetAllMocks());
describe("server restore adapter",()=>{
  it("uses one atomic PG restore function without trusting browser-supplied JSON",async()=>{
    const query=vi.fn().mockResolvedValue({rows:[{result:{slug:"about",version:6,draftRevision:10,restoredFromVersion:2}}]});
    getPool.mockResolvedValue({query});
    expect(await restoreCmsRevision(input)).toMatchObject({draftRevision:10});
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("cms_restore_revision");
    expect(query.mock.calls[0][1]).not.toContainEqual(expect.objectContaining({snapshot:expect.anything()}));
  });
  it("uses service role Supabase RPC when PG is absent",async()=>{
    getPool.mockResolvedValue(null);
    const restoreRevision=vi.fn().mockResolvedValue({slug:"about",version:6,draftRevision:10});
    createSupabaseDatabase.mockReturnValue({restoreRevision});
    await restoreCmsRevision(input);
    expect(restoreRevision).toHaveBeenCalledWith(input);
  });
  it("recognizes a concurrent editor's stale published or draft revision",async()=>{
    getPool.mockResolvedValue({query:vi.fn().mockRejectedValue({code:"40001",message:"CMS_VERSION_CONFLICT"})});
    await expect(restoreCmsRevision(input)).rejects.toBeInstanceOf(CmsRestoreConflictError);
  });
  it("refuses invalid slugs, modes, negative versions and malformed request ids",()=>{
    for(const invalid of [{...input,slug:"../secret"},{...input,mode:"delete"},{...input,sourceVersion:-1},
      {...input,expectedDraftRevision:-3},{...input,requestId:"bad"}]){
      expect(()=>checkRestoreRequest(invalid as typeof input)).toThrow();
    }
  });
});
