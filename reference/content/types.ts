export interface ImageRef {
  src: string;
  alt?: string;
  fallback?: string;
  type?: "image" | "video";
}

/**
 * Read a URL out of a document field that should be a string but may
 * have been corrupted into an ImageRef-shaped object by earlier editor
 * versions (which wrote {src} onto string fields — the "[object Object]"
 * bug). Always returns a usable string.
 */
export function assetSrc(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as ImageRef).src === "string") {
    return (value as ImageRef).src;
  }
  return "";
}
