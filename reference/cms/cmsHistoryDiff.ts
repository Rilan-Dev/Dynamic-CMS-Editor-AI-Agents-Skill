import type { JsonObject, JsonValue } from "./json";

export type CmsChangeCategory = "text" | "media" | "layout" | "style" | "animation" | "data";
export type CmsChangeType = "added" | "removed" | "changed";
export interface CmsSnapshotChange {
  path: string;
  label: string;
  category: CmsChangeCategory;
  type: CmsChangeType;
  before: JsonValue | undefined;
  after: JsonValue | undefined;
}
const labelFor = (path: string) => path.replace(/\.(\d+)/g, " item $1").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[._-]/g," ").trim();
const categoryFor = (path: string): CmsChangeCategory => {
  if (/(animation|transition|motion|trigger|duration|easing)/i.test(path)) return "animation";
  if (/(theme|palette|font|color|colour|background|style)/i.test(path)) return "style";
  if (/(image|src|logo|thumbnail|photo|video|gallery|cover|banner)/i.test(path)) return "media";
  if (/(layout|block|section|order|column|grid)/i.test(path)) return "layout";
  if (/(title|heading|text|label|description|content|caption|paragraph|href|url)/i.test(path)) return "text";
  return "data";
};
const equal = (a: unknown,b:unknown):boolean => {
  if (Object.is(a,b)) return true;
  if (!a || !b || typeof a!=="object" || typeof b!=="object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length===b.length && a.every((v,i)=>equal(v,b[i]));
  }
  const ka=Object.keys(a),kb=Object.keys(b);
  return ka.length===kb.length && ka.every(k=>Object.hasOwn(b,k)&&equal((a as JsonObject)[k],(b as JsonObject)[k]));
};
export function diffCmsSnapshots(before: JsonObject, after: JsonObject, limit=120): CmsSnapshotChange[] {
  const changes:CmsSnapshotChange[]=[];
  const cap=Math.max(0,Math.min(500,limit));
  const visit=(left:JsonValue|undefined,right:JsonValue|undefined,path:string,depth:number) => {
    if (changes.length>=cap || depth>20 || equal(left,right)) return;
    const objects=(v:unknown):v is JsonObject => v!==null&&typeof v==="object"&&!Array.isArray(v);
    if (objects(left)&&objects(right)) {
      for (const key of new Set([...Object.keys(left),...Object.keys(right)])) {
        if(changes.length>=cap)break;
        visit(left[key],right[key],path?path+"."+key:key,depth+1);
      }
      return;
    }
    if(Array.isArray(left)&&Array.isArray(right)) {
      for(let i=0;i<Math.max(left.length,right.length)&&changes.length<cap;i++) {
        visit(left[i],right[i],path+"."+i,depth+1);
      }
      return;
    }
    changes.push({path:path||"Document",label:labelFor(path)||"Document",
      category:categoryFor(path),type:left===undefined?"added":right===undefined?"removed":"changed",
      before:left,after:right});
  };
  visit(before,after,"",0);
  return changes;
}
