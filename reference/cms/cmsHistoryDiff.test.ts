import { describe, expect, it } from "vitest";
import { diffCmsSnapshots } from "./cmsHistoryDiff";
describe("semantic snapshot comparison", () => {
  it("classifies text, media, layout, animation, style, add/remove and array changes", () => {
    const before={hero:{title:"Old",image:"/old.jpg"},theme:{scheme:"light"},animations:{trigger:"scroll"},
      blocks:[{id:"one",title:"A"}],footer:{label:"Remove"}};
    const after={hero:{title:"New",image:"/new.jpg"},theme:{scheme:"dark"},animations:{trigger:"click"},
      blocks:[{id:"one",title:"A"},{id:"two",title:"B"}],header:{label:"Added"}};
    const changes=diffCmsSnapshots(before,after);
    const kind=(path:string)=>changes.find(c=>c.path===path);
    expect(kind("hero.title")?.category).toBe("text");
    expect(kind("hero.image")?.category).toBe("media");
    expect(kind("theme.scheme")?.category).toBe("style");
    expect(kind("animations.trigger")?.category).toBe("animation");
    expect(changes.some(c=>c.category==="layout"&&c.path.includes("blocks"))).toBe(true);
    expect(changes.some(c=>c.type==="removed")).toBe(true);
    expect(changes.some(c=>c.type==="added")).toBe(true);
  });
  it("does not report changes for JSON-equivalent documents or different object key order", () => {
    expect(diffCmsSnapshots({title:"A",hero:{x:1,y:2}}, {hero:{y:2,x:1},title:"A"})).toEqual([]);
  });
  it("truncates enormous comparisons deterministically", () => {
    const before=Object.fromEntries(Array.from({length:200},(_,i)=>["field"+i,"before"]));
    const after=Object.fromEntries(Array.from({length:200},(_,i)=>["field"+i,"after"]));
    expect(diffCmsSnapshots(before,after,15)).toHaveLength(15);
  });
});
