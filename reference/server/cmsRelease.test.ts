import { beforeEach, describe, expect, it, vi } from "vitest";
const { getPool, createSupabaseDatabase } = vi.hoisted(() => ({
  getPool: vi.fn(), createSupabaseDatabase: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ getPool }));
vi.mock("@/lib/server/supabaseDatabase", () => ({ createSupabaseDatabase }));

import { publishCmsRelease, CmsVersionConflictError } from "./cmsRelease";

const request = {
  requestId: "7c0f4581-1e23-4b39-862d-9bbf2dc19701",
  documents: [{ slug: "about", expectedVersion: 3, expectedDraftRevision: 8, document: { hero: { title: "Updated" } } }],
};

describe("atomic CMS release adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits the entire release as one database transaction/RPC invocation", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ result: { releaseId: "done", documents: [{ slug: "about", version: 4, draftRevision: 9 }] } }] });
    getPool.mockResolvedValue({ query });
    const result = await publishCmsRelease(request);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("cms_publish_release");
    expect(result.documents[0].version).toBe(4);
  });

  it("uses exactly one Supabase RPC when direct PostgreSQL is unavailable", async () => {
    getPool.mockResolvedValue(null);
    const publishRelease = vi.fn().mockResolvedValue({ releaseId: "ok", documents: [] });
    createSupabaseDatabase.mockReturnValue({ publishRelease });
    await publishCmsRelease(request);
    expect(publishRelease).toHaveBeenCalledWith(request.requestId, request.documents);
  });

  it("reports stale versions as a conflict instead of a generic 500", async () => {
    getPool.mockResolvedValue({ query: vi.fn().mockRejectedValue({ code: "40001", message: "CMS_VERSION_CONFLICT" }) });
    await expect(publishCmsRelease(request)).rejects.toBeInstanceOf(CmsVersionConflictError);
  });

  it("rejects missing, duplicate, or malformed documents before database writes", async () => {
    await expect(publishCmsRelease({ ...request, documents: [] })).rejects.toThrow();
    await expect(publishCmsRelease({ ...request, documents: [request.documents[0], request.documents[0]] })).rejects.toThrow();
    expect(getPool).not.toHaveBeenCalled();
  });
});
