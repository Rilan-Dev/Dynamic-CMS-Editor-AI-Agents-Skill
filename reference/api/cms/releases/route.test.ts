import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CMS_SESSION_COOKIE, createCmsSessionToken } from "@/lib/server/cmsSession";

const { publishCmsRelease, validateReleaseDocuments, getEntry, revalidateCmsPaths } = vi.hoisted(() => ({
  publishCmsRelease: vi.fn(), validateReleaseDocuments: vi.fn(), getEntry: vi.fn(), revalidateCmsPaths: vi.fn(),
}));
vi.mock("@/lib/server/cmsRelease", () => ({
  publishCmsRelease,
  checkReleaseRequest: (r: { documents?: unknown[] }) => { if (!Array.isArray(r.documents) || !r.documents.length) throw new Error("Invalid"); },
  CmsVersionConflictError: class extends Error {},
}));
vi.mock("@/lib/server/cmsReleaseValidation", () => ({ validateReleaseDocuments }));
vi.mock("@/lib/server/contentStore", () => ({ getEntry }));
vi.mock("@/lib/server/cmsRevalidation", () => ({ revalidateCmsPaths }));

import { POST } from "./route";
const body = {
  requestId: "7c0f4581-1e23-4b39-862d-9bbf2dc19701",
  documents: [{ slug: "about", expectedVersion: 2, expectedDraftRevision: 4, document: { hero: { title: "Updated" } } }],
};
const req = (auth = true, data: unknown = body) =>
  new Request("https://example.com/api/cms/releases", { method: "POST",
    headers: { host: "example.com", "content-type": "application/json",
      ...(auth ? { cookie: `${CMS_SESSION_COOKIE}=${createCmsSessionToken("secret")}` } : {}) },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.stubEnv("CMS_EDIT_KEY", "secret");
  vi.stubEnv("NODE_ENV", "production");
  validateReleaseDocuments.mockResolvedValue([]);
  publishCmsRelease.mockResolvedValue({ releaseId: "release-id", documents: [{slug:"about",version:3,draftRevision:5}] });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("POST /api/cms/releases", () => {
  it("rejects anonymous requests before touching content storage", async () => {
    expect((await POST(req(false))).status).toBe(401);
    expect(publishCmsRelease).not.toHaveBeenCalled();
  });
  it("publishes the validated documents in exactly one transaction then revalidates", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(publishCmsRelease).toHaveBeenCalledTimes(1);
    expect(revalidateCmsPaths).toHaveBeenCalledWith(["about"]);
  });
  it("never publishes invalid server-side content", async () => {
    validateReleaseDocuments.mockResolvedValue([{code:"unsafe-url",message:"Unsafe link",path:["href"]}]);
    const res = await POST(req());
    expect(res.status).toBe(422);
    expect(publishCmsRelease).not.toHaveBeenCalled();
  });
  it("fails closed when version preconditions are missing", async () => {
    const res = await POST(req(true,{requestId:body.requestId,documents:[{slug:"about",document:{hero:{title:"x"}}}]}));
    expect(res.status).toBe(428);
    expect(publishCmsRelease).not.toHaveBeenCalled();
  });
});
