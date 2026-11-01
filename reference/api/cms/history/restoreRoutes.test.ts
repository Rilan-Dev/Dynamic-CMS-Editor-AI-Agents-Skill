import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { CMS_SESSION_COOKIE, createCmsSessionToken } from "@/lib/server/cmsSession";
const {getCmsVersion,getEntry,validateReleaseDocuments,restoreCmsRevision,revalidateCmsPaths}=vi.hoisted(()=>({
  getCmsVersion:vi.fn(),getEntry:vi.fn(),validateReleaseDocuments:vi.fn(),restoreCmsRevision:vi.fn(),revalidateCmsPaths:vi.fn(),
}));
vi.mock("@/lib/server/cmsHistory",()=>({getCmsVersion}));
vi.mock("@/lib/server/contentStore",()=>({getEntry}));
vi.mock("@/lib/server/cmsReleaseValidation",()=>({validateReleaseDocuments}));
vi.mock("@/lib/server/cmsRestore",()=>({
  restoreCmsRevision,
  checkRestoreRequest:(r:{slug:string;mode:string;sourceVersion:number})=>{if(r.sourceVersion<0||!/^[a-z0-9-]+$/.test(r.slug)||!["draft","publish"].includes(r.mode))throw Error("Invalid");},
  CmsRestoreConflictError:class extends Error {},
  CmsRestoreNotFoundError:class extends Error {},
}));
vi.mock("@/lib/server/cmsRevalidation",()=>({revalidateCmsPaths}));
import { POST } from "./[slug]/[version]/restore/route";
const payload={requestId:"7c0f4581-1e23-4b39-862d-9bbf2dc19701",mode:"draft",expectedVersion:7,expectedDraftRevision:8};
const req=(auth=true,data:unknown=payload)=>new Request("https://test.example/api/cms/history/about/2/restore",{
  method:"POST",headers:{"content-type":"application/json",...(auth?{cookie:`${CMS_SESSION_COOKIE}=${createCmsSessionToken("secret")}`}:{})},
  body:JSON.stringify(data),
});
const ctx={params:Promise.resolve({slug:"about",version:"2"})};
beforeEach(()=>{vi.stubEnv("CMS_EDIT_KEY","secret");vi.stubEnv("NODE_ENV","production");
  getCmsVersion.mockResolvedValue({snapshot:{hero:{title:"Archive"}},revision:{version:2,slug:"about"}});
  getEntry.mockResolvedValue({version:7,draftRevision:8,published:{hero:{title:"Current"}},draft:{hero:{title:"Current"}}});
  validateReleaseDocuments.mockResolvedValue([]);
  restoreCmsRevision.mockResolvedValue({slug:"about",mode:"draft",version:7,draftRevision:9,snapshot:{hero:{title:"Archive"}}});
});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()});
describe("restore endpoint",()=>{
  it("rejects unauthorized requests before fetching private snapshots",async()=>{
    expect((await POST(req(false),ctx)).status).toBe(401);
    expect(getCmsVersion).not.toHaveBeenCalled();
  });
  it("requires conditional preconditions and a valid restore action",async()=>{
    expect((await POST(req(true,{mode:"publish"}),ctx)).status).toBe(428);
    expect((await POST(req(true,{...payload,mode:"erase"}),ctx)).status).toBe(422);
    expect(restoreCmsRevision).not.toHaveBeenCalled();
  });
  it("uses the authenticated server snapshot, validates, then restores to draft",async()=>{
    const res=await POST(req(),ctx);
    expect(res.status).toBe(200);
    expect(validateReleaseDocuments).toHaveBeenCalledWith([expect.objectContaining({
      slug:"about",document:{hero:{title:"Archive"}},
    })]);
    expect(restoreCmsRevision).toHaveBeenCalledWith(expect.objectContaining({slug:"about",sourceVersion:2,mode:"draft"}));
    expect(revalidateCmsPaths).not.toHaveBeenCalled();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
  it("rejects unsafe historic content, even though it was once published",async()=>{
    validateReleaseDocuments.mockResolvedValue([{code:"unsafe-url"}]);
    expect((await POST(req(),ctx)).status).toBe(422);
    expect(restoreCmsRevision).not.toHaveBeenCalled();
  });
  it("requires the historical version to exist and cannot silently fabricate it",async()=>{
    getCmsVersion.mockResolvedValue(null);
    expect((await POST(req(),ctx)).status).toBe(404);
  });
});
