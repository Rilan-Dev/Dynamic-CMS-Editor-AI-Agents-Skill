/** URL-safe identity for a project, and the document name that stores it. */
export const PROJECT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PROJECT_DOCUMENT_PREFIX = "project-";

const MAX_SLUG_LENGTH = 64;

export function projectSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug || "project";
}

export const projectDocumentName = (slug: string): string =>
  `${PROJECT_DOCUMENT_PREFIX}${slug}`;

export const isProjectDocument = (documentName: string): boolean =>
  documentName.startsWith(PROJECT_DOCUMENT_PREFIX) &&
  documentName.length > PROJECT_DOCUMENT_PREFIX.length;

export function projectSlugFromDocument(documentName: string): string | null {
  if (!isProjectDocument(documentName)) return null;
  return documentName.slice(PROJECT_DOCUMENT_PREFIX.length);
}
