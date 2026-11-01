import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CMS_SESSION_COOKIE, createCmsSessionToken } from "@/lib/server/cmsSession";
const { listCmsVersions, getCmsVersion } = vi.hoisted(() => ({
  listCmsVersions:vi.fn(),getCmsVersion:vi.fn(),
}));
vi.mock("@/lib/server/cmsHistory",()=>({
  listCmsVersions,getCmsVersion,
  CmsHistoryUnavailableError: class extends Error {},
}));
import { GET as list } from "./[slug]/route";
import { GET as detail } from "./[slug]/[version]/route";
const cookie = () => `${CMS_SESSION_COOKIE}=${createCmsSessionToken("secret")}`;
const request = (path:string, authorized=true) =>
  new Request("https://smts.example"+path,{
    headers:{host:"smts.example", ...(authorized?{cookie:cookie()}:{})},
  });
const ctx = {params:Promise.resolve({slug:"about"})};
beforeEach(()=>{
  vi.stubEnv("CMS_EDIT_KEY","secret");vi.stubEnv("NODE_ENV","production");
  listCmsVersions.mockResolvedValue({items:[],nextBefore:null,currentVersion:0});
  getCmsVersion.mockResolvedValue(null);
});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe("CMS history routes",()=>{
  it("protects both list and full unpublished historical snapshots",async()=>{
    const a=await list(request("/api/cms/history/about",false),ctx);
    const b=await detail(request("/api/cms/history/about/3",false),
      {params:Promise.resolve({slug:"about",version:"3"})});
    expect(a.status).toBe(401);expect(b.status).toBe(401);
    expect(listCmsVersions).not.toHaveBeenCalled();
    expect(getCmsVersion).not.toHaveBeenCalled();
  });
  it("prevents caching even for authorized history and enforces keyset bounds",async()=>{
    const res=await list(request("/api/cms/history/about?before=0"),ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(listCmsVersions).toHaveBeenCalledWith("about",0);
  });
  it("rejects malformed slugs, cursors, and versions before storage access",async()=>{
    const paths=["/api/cms/history/about?before=-1","/api/cms/history/about?before=hello"];
    for(const p of paths)expect((await list(request(p),ctx)).status).toBe(400);
    expect((await list(request("/api/cms/history/invalid"),{params:Promise.resolve({slug:"../data"})})).status).toBe(400);
    expect((await detail(request("/api/cms/history/about/1e3"),
      {params:Promise.resolve({slug:"about",version:"1e3"})})).status).toBe(400);
    expect(listCmsVersions).not.toHaveBeenCalled();
    expect(getCmsVersion).not.toHaveBeenCalled();
  });
  it("returns 404 for missing versions and never invents restored content",async()=>{
    const res=await detail(request("/api/cms/history/about/5"),
      {params:Promise.resolve({slug:"about",version:"5"})});
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
