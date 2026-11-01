/** URL-safe identity for a post, and the document name that stores it. */
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BLOG_DOCUMENT_PREFIX = "blog-";

const MAX_SLUG_LENGTH = 64;

export function blogSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug || "post";
}

export const blogDocumentName = (slug: string): string =>
  `${BLOG_DOCUMENT_PREFIX}${slug}`;

export const isBlogDocument = (documentName: string): boolean =>
  documentName.startsWith(BLOG_DOCUMENT_PREFIX) &&
  documentName.length > BLOG_DOCUMENT_PREFIX.length;

export function blogSlugFromDocument(documentName: string): string | null {
  if (!isBlogDocument(documentName)) return null;
  return documentName.slice(BLOG_DOCUMENT_PREFIX.length);
}
