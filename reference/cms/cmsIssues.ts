import type { CmsValidationError } from "./documentValidation";
import type { PathSegment } from "./json";

/**
 * Marker an editable field carries in edit mode (`data-cms-path`), so an
 * issue can scroll to and focus the exact field it is about.
 */
export const cmsPathKey = (scope: string, path: PathSegment[]): string =>
  `${scope}:${path.map(String).join(".")}`;

const KEY_LABELS: Record<string, string> = {
  selectedServiceIds: "Footer services",
  socialLinks: "Social links",
  legalLinks: "Legal links",
  links: "Links",
  navbar: "Navbar",
  footer: "Footer",
  hero: "Hero",
  cta: "Call to action",
  theme: "Theme",
  fonts: "Fonts",
  entries: "Updates",
  categories: "Categories",
  services: "Services",
  children: "Sub-services",
  jobs: "Job postings",
  animations: "Animations",
  body: "Article body",
  gallery: "Gallery",
};

const humanize = (key: string) =>
  KEY_LABELS[key] ??
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (first) => first.toUpperCase());

/** `["footer", "selectedServiceIds", 1]` → "Footer › Footer services › #2". */
export function issueLocation(path: PathSegment[]): string {
  if (!path.length) return "Whole document";
  return path
    .map((segment) => (typeof segment === "number" ? `#${segment + 1}` : humanize(segment)))
    .join(" › ");
}

/** Which document an issue belongs to, as an editor would name it. */
export function issueDocumentLabel(error: CmsValidationError, pageSlug: string): string {
  const document = error.document ?? "page";
  if (document === "site") return "Site-wide (navbar, footer & theme)";
  if (document === "page") return `This page (${pageSlug})`;
  return `${humanize(document)} document`;
}

/** The editor scope an issue's path belongs to. */
export const issueScope = (error: CmsValidationError): string => {
  const document = error.document ?? "page";
  return document === "page" || document === "site" ? document : `doc:${document}`;
};

/** Issues grouped by document, in a stable order: page, site, the rest. */
export function groupIssues(errors: CmsValidationError[], pageSlug: string) {
  const order = (error: CmsValidationError) =>
    error.document === "site" ? 1 : !error.document || error.document === "page" ? 0 : 2;
  const groups = new Map<string, CmsValidationError[]>();
  [...errors]
    .sort((a, b) => order(a) - order(b))
    .forEach((error) => {
      const label = issueDocumentLabel(error, pageSlug);
      groups.set(label, [...(groups.get(label) ?? []), error]);
    });
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

const FOOTER_REFERENCE_CODES = new Set([
  "unknown-service-reference",
  "hidden-service-reference",
  "unpublished-service-reference",
  "duplicate-service-reference",
  "invalid-service-reference",
]);

/** A footer service selection the editor can simply drop, if this is one. */
export function removableFooterSelection(error: CmsValidationError): number | null {
  if (error.document !== "site" || !FOOTER_REFERENCE_CODES.has(error.code)) return null;
  const [footer, key, index] = error.path;
  return footer === "footer" && key === "selectedServiceIds" && typeof index === "number"
    ? index
    : null;
}
