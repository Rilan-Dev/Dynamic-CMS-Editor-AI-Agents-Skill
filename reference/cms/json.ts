/** JSON document types shared by the CMS editor, store, and API. */

export type PathSegment = string | number;

export type JsonPrimitive = string | number | boolean | null;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** Immutably set a value at a JSON path, creating objects/arrays as needed. */
export function setAtPath(doc: JsonObject, pathSegs: PathSegment[], value: JsonValue): JsonObject {
  if (pathSegs.length === 0) {
    return (value ?? {}) as JsonObject;
  }
  const clone = (node: JsonValue, depth: number): JsonValue => {
    if (depth === pathSegs.length) return value;
    const seg = pathSegs[depth];
    if (typeof seg === "number") {
      const arr = Array.isArray(node) ? [...node] : [];
      arr[seg] = clone(arr[seg] ?? null, depth + 1);
      return arr;
    }
    const obj =
      node && typeof node === "object" && !Array.isArray(node)
        ? { ...(node as JsonObject) }
        : {};
    obj[seg] = clone(obj[seg] ?? null, depth + 1);
    return obj;
  };
  return clone(doc, 0) as JsonObject;
}

/** Read a value at a JSON path. */
export function getAtPath(doc: JsonValue, pathSegs: PathSegment[]): JsonValue | undefined {
  return pathSegs.reduce<JsonValue | undefined>((acc, seg) => {
    if (acc === null || acc === undefined) return undefined;
    if (Array.isArray(acc) && typeof seg === "number") return acc[seg];
    if (typeof acc === "object" && !Array.isArray(acc)) return (acc as JsonObject)[String(seg)];
    return undefined;
  }, doc);
}
