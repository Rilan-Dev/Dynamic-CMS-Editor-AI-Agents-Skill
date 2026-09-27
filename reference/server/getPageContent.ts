import { normalizeCmsDocument } from "@/components/cms/documentNormalization";
import type { JsonObject, JsonValue } from "@/components/cms/json";
import { getPublished } from "./contentStore";

/**
 * Deep-merge registry defaults under a published document. Objects merge
 * recursively; arrays and primitives remain editor-controlled.
 */
function deepMerge(fallback: JsonValue, published: JsonValue): JsonValue {
  if (
    fallback === null ||
    published === null ||
    typeof fallback !== "object" ||
    typeof published !== "object" ||
    Array.isArray(fallback) ||
    Array.isArray(published)
  ) {
    return published;
  }
  const out: JsonObject = { ...(fallback as JsonObject) };
  for (const [key, value] of Object.entries(published as JsonObject)) {
    const base = (fallback as JsonObject)[key];
    out[key] = base === undefined ? value : deepMerge(base, value);
  }
  return out;
}

/**
 * Content read path for pages and shared site chrome. Every result passes
 * through the same migration/normalization layer as the editor, ensuring old
 * published documents gain stable IDs and new schema defaults for visitors.
 */
export async function getPageContent<T extends object>(
  slug: string,
  fallback: T,
): Promise<T> {
  const fallbackJson = fallback as unknown as JsonObject;
  try {
    const published = await getPublished(slug);
    if (published) {
      return normalizeCmsDocument(
        slug,
        deepMerge(fallbackJson, published as JsonValue) as JsonObject,
      ) as unknown as T;
    }
  } catch {
    // store unreadable → serve normalized fallback; never take the page down
  }
  return normalizeCmsDocument(slug, fallbackJson) as unknown as T;
}

/** The fallback doc as a plain JSON object (editor seed for new drafts). */
export function asJson<T extends object>(doc: T): JsonObject {
  return JSON.parse(JSON.stringify(doc)) as JsonObject;
}
