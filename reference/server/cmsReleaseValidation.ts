import { validateCmsDocuments, validateRelatedDocument, type CmsValidationError } from "@/components/cms/documentValidation";
import type { JsonObject } from "@/components/cms/json";
import { CONTENT_REGISTRY } from "@/content/registry";
import { getEntry } from "@/lib/server/contentStore";
import type { CmsReleaseDocument } from "@/lib/server/cmsRelease";

/** Check the complete proposed release on the server. No browser validation is trusted. */
export async function validateReleaseDocuments(documents: CmsReleaseDocument[]): Promise<CmsValidationError[]> {
  const pending = new Map(documents.map((d) => [d.slug, d.document]));
  const load = async (slug: string): Promise<JsonObject | null> => {
    if (pending.has(slug)) return pending.get(slug)!;
    const entry = await getEntry(slug);
    return (entry?.published ?? (CONTENT_REGISTRY as Record<string, JsonObject>)[slug] ?? null) as JsonObject | null;
  };
  const [site, services, blogs, projects] = await Promise.all([
    load("site"), load("services"), load("blogs"), load("projects"),
  ]);
  const [siteEntry, servicesEntry] = await Promise.all([getEntry("site"), getEntry("services")]);
  const problems: CmsValidationError[] = [];
  for (const item of documents) {
    const page = item.slug === "site" ? null : item.document;
    const nextSite = item.slug === "site" ? item.document : site;
    const errors = validateCmsDocuments(page, nextSite, {
      servicesDraft: services,
      servicesPublished: pending.has("services") ? services : servicesEntry?.published ?? null,
      publishingServices: pending.has("services"),
      sitePublished: siteEntry?.published ?? null,
      blogIndexDraft: blogs,
      projectIndexDraft: projects,
    });
    if (item.slug !== "site") errors.push(...validateRelatedDocument(item.slug, item.document));
    problems.push(...errors.map((error) => ({
      ...error,
      document: error.document === "site" ? "site" : item.slug,
    })));
  }
  return problems;
}
