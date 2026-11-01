import { describe, expect, it } from "vitest";
import { previewCmsSnapshot, safeHistoryImageUrl } from "./cmsHistoryPreview";
describe("read-only CMS historical preview projection",()=>{
  it("shows user-visible nested content while skipping implementation settings",()=>{
    const nodes=previewCmsSnapshot({
      hero:{title:"Our work",image:"/images/site.jpg",description:"Dubai contracting"},
      animations:{onEnter:{duration:300}},internalId:"secret",
    });
    expect(nodes.some(n=>n.kind==="heading"&&n.text==="Our work")).toBe(true);
    expect(nodes.some(n=>n.kind==="image"&&n.imageUrl==="/images/site.jpg")).toBe(true);
    expect(nodes.some(n=>n.text==="Dubai contracting")).toBe(true);
    expect(nodes.some(n=>String(n.text).includes("duration"))).toBe(false);
  });
  it("rejects script, data, remote and protocol-relative image URLs in previews",()=>{
    for(const url of ["javascript:alert(1)","data:image/svg+xml,...","https://elsewhere.example/a.png","//elsewhere.example/a.png","/\\\\evil","/foo\n.png"]){
      expect(safeHistoryImageUrl(url)).toBeNull();
    }
    expect(safeHistoryImageUrl("/media/archive.jpg")).toBe("/media/archive.jpg");
  });
});
