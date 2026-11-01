import type { JsonObject, JsonValue } from "./json";

export interface HistoryPreviewNode {
  kind: "heading" | "text" | "image";
  text: string;
  path: string;
  imageUrl?: string;
}

const IGNORE_KEYS = /^(id|internalId|animations|animation|motion|schemaVersion|preset|duration|delay|easing|trigger|threshold|theme|fonts|style|styles)$/i;
const IMAGE_KEYS = /(?:image|img|photo|picture|logo|cover|thumbnail|banner|src)$/i;
const HEADING_KEYS = /^(?:title|heading|headline|name|sectionTitle|label)$/i;

/** Only render same-origin media paths. Never execute or embed untrusted historical markup. */
export function safeHistoryImageUrl(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\s<>"']/u.test(value))
    return null;
  return value;
}

/**
 * Lightweight visual content overview derived from the immutable snapshot.
 * This intentionally does not claim to reproduce historical JavaScript/layout.
 * Every field remains available in a collapsed JSON details view.
 */
export function previewCmsSnapshot(doc: JsonObject, maxNodes = 100): HistoryPreviewNode[] {
  const out: HistoryPreviewNode[] = [];
  const walk = (value: JsonValue, key: string, path: string, depth: number) => {
    if (out.length >= maxNodes || depth > 10 || IGNORE_KEYS.test(key)) return;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      const url = IMAGE_KEYS.test(key) ? safeHistoryImageUrl(trimmed) : null;
      if (url) out.push({kind:"image",text:key,path,imageUrl:url});
      else if (!IMAGE_KEYS.test(key) && !trimmed.startsWith("data:"))
        out.push({kind:HEADING_KEYS.test(key)?"heading":"text",text:trimmed,path});
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (let i=0;i<value.length&&out.length<maxNodes;i+=1)
        walk(value[i] as JsonValue,key+" item",path+"."+i,depth+1);
      return;
    }
    if (typeof value.src === "string") {
      const url = safeHistoryImageUrl(value.src);
      if (url && out.length < maxNodes) out.push({
        kind:"image",text:typeof value.alt==="string"?value.alt:key,path,imageUrl:url,
      });
      return;
    }
    for (const [childKey, child] of Object.entries(value)) {
      if (out.length >= maxNodes) break;
      walk(child as JsonValue,childKey,path?path+"."+childKey:childKey,depth+1);
    }
  };
  walk(doc,"document","",0);
  return out;
}
