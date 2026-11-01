import {
  ANIMATION_PRESETS,
  ANIMATION_TRIGGERS,
} from "@/components/animations/types";
import {
  isSocialPlatform,
  migrateSocialLinks,
  validateSocialHref,
} from "@/components/footer/socialLinks";
import {
  MAX_FOOTER_SERVICES,
} from "@/components/services/serviceCatalog";
import { flattenServiceCatalogue } from "@/components/services/serviceHierarchy";
import { BLOCK_TYPES } from "@/components/blog/blogModel";
import { BLOG_SLUG_PATTERN } from "@/components/blog/blogSlug";
import { PROJECT_SLUG_PATTERN } from "@/components/projects/projectSlug";
import { SERVICE_SLUG_PATTERN } from "@/components/services/serviceSlug";
import {
  FONT_OPTIONS,
  THEME_COLOR_KEYS,
  THEME_COLOR_LABELS,
  THEME_PRESETS,
  isHexColor,
} from "@/components/theme/siteTheme";
import type { JsonObject, JsonValue, PathSegment } from "./json";

export type CmsValidationCode =
  | "unsafe-url"
  | "invalid-theme-color"
  | "unknown-theme-preset"
  | "unknown-theme-font"
  | "duplicate-id"
  | "missing-id"
  | "invalid-duration"
  | "invalid-delay"
  | "invalid-threshold"
  | "unknown-preset"
  | "unknown-trigger"
  | "unsupported-social-platform"
  | "duplicate-social-platform"
  | "invalid-social-url"
  | "too-many-footer-services"
  | "duplicate-service-reference"
  | "invalid-service-reference"
  | "unknown-service-reference"
  | "hidden-service-reference"
  | "unpublished-service-reference"
  | "missing-blog-title"
  | "invalid-blog-slug"
  | "invalid-blog-date"
  | "invalid-blog-status"
  | "unknown-blog-category"
  | "empty-blog-body"
  | "unknown-block-type"
  | "missing-project-title"
  | "invalid-project-slug"
  | "invalid-project-status"
  | "unknown-project-category"
  | "unknown-project-service"
  | "hidden-project-service"
  | "invalid-service-slug"
  | "duplicate-service-slug"
  | "invalid-career-email"
  | "invalid-job-status"
  | "missing-job-title"
  | "missing-job-department"
  | "missing-job-location"
  | "invalid-job-posted-date"
  | "invalid-job-closing-date"
  | "job-closing-before-posted"
  | "missing-update-headline"
  | "invalid-update-date"
  | "invalid-update-status"
  | "unknown-update-type";

export interface CmsValidationError {
  code: CmsValidationCode;
  path: PathSegment[];
  message: string;
  /**
   * Which document the path is in: "page" (the current page), "site"
   * (navbar/footer/theme) or a related document's slug. Set by
   * validateCmsDocuments / validateRelatedDocument so the editor can say
   * where an issue is and jump to it.
   */
  document?: string;
}

const LINK_KEYS = new Set([
  "href",
  "url",
  "verificationUrl",
  "logoHref",
  "callHref",
  "emailHref",
  "primaryButtonHref",
  "secondaryButtonHref",
  "buttonHref",
]);

const PAGE_TRANSITION_PRESETS = new Set([
  "none",
  "fade",
  "slide-left",
  "slide-right",
  "scale",
  "wipe",
  "curtain",
]);

const CAREER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const asPath = (path: PathSegment[]): string => path.map(String).join(".");

const isJsonObject = (
  value: JsonValue | undefined,
): value is JsonObject =>
  !!value && typeof value === "object" && !Array.isArray(value);

const validIsoDate = (value: unknown): value is string =>
  typeof value === "string" &&
  ISO_DATE_RE.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function isSafeCmsUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return true;

  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const validateNumberRange = (
  value: JsonValue,
  path: PathSegment[],
  minimum: number,
  maximum: number,
  code: CmsValidationCode,
  label: string,
  errors: CmsValidationError[],
) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    errors.push({
      code,
      path,
      message: `${label} at ${asPath(path)} must be between ${minimum} and ${maximum}.`,
    });
  }
};

export const validateDocument = (document: JsonObject, scope: "page" | "site") => {
  const errors: CmsValidationError[] = [];
  const ids = new Map<string, PathSegment[]>();

  const visit = (value: JsonValue, path: PathSegment[]) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, [...path, index]));
      return;
    }
    if (!value || typeof value !== "object") return;

    const object = value as JsonObject;
    const id = object.id;
    if (typeof id === "string") {
      if (!id.trim()) {
        errors.push({
          code: "missing-id",
          path: [...path, "id"],
          message: `Item at ${asPath(path)} must have a stable ID.`,
        });
      } else if (ids.has(id)) {
        errors.push({
          code: "duplicate-id",
          path: [...path, "id"],
          message: `Duplicate ID “${id}” at ${asPath(path)}.`,
        });
      } else {
        ids.set(id, [...path, "id"]);
      }
    }

    Object.entries(object).forEach(([key, child]) => {
      const childPath = [...path, key];

      if (
        LINK_KEYS.has(key) &&
        typeof child === "string" &&
        !isSafeCmsUrl(child)
      ) {
        errors.push({
          code: "unsafe-url",
          path: childPath,
          message: `Unsafe or unsupported URL at ${scope}.${asPath(childPath)}.`,
        });
      }

      if (["durationMs", "enterDurationMs", "exitDurationMs"].includes(key)) {
        validateNumberRange(
          child,
          childPath,
          0,
          30_000,
          "invalid-duration",
          "Duration",
          errors,
        );
      }
      if (["delayMs", "staggerMs"].includes(key)) {
        validateNumberRange(
          child,
          childPath,
          0,
          30_000,
          "invalid-delay",
          "Delay",
          errors,
        );
      }
      if (key === "threshold") {
        validateNumberRange(
          child,
          childPath,
          0,
          1,
          "invalid-threshold",
          "Threshold",
          errors,
        );
      }
      if (key === "preset" && typeof child === "string") {
        const inPageTransition = path.some(
          (segment) => segment === "pageTransition",
        );
        const accepted = inPageTransition
          ? PAGE_TRANSITION_PRESETS.has(child)
          : (ANIMATION_PRESETS as readonly string[]).includes(child);
        if (!accepted) {
          errors.push({
            code: "unknown-preset",
            path: childPath,
            message: `Unknown animation preset “${child}” at ${asPath(childPath)}.`,
          });
        }
      }
      if (
        key === "trigger" &&
        typeof child === "string" &&
        !(ANIMATION_TRIGGERS as readonly string[]).includes(child)
      ) {
        errors.push({
          code: "unknown-trigger",
          path: childPath,
          message: `Unknown animation trigger “${child}” at ${asPath(childPath)}.`,
        });
      }

      visit(child, childPath);
    });
  };

  visit(document, []);
  return errors;
};

function validateCareersDocument(
  document: JsonObject,
): CmsValidationError[] {
  if (document.applicationEmail === undefined && document.jobsIntro === undefined) {
    return [];
  }

  const errors: CmsValidationError[] = [];
  const applicationEmail =
    typeof document.applicationEmail === "string"
      ? document.applicationEmail.trim()
      : "";

  if (!CAREER_EMAIL_RE.test(applicationEmail)) {
    errors.push({
      code: "invalid-career-email",
      path: ["applicationEmail"],
      message: "Careers application email must be a valid mailbox address.",
    });
  }

  if (!Array.isArray(document.jobs)) return errors;

  document.jobs.forEach((value, index) => {
    if (!isJsonObject(value)) return;

    const path = ["jobs", index] as PathSegment[];
    const status = value.status;
    const visibleOpen = value.visible !== false && status === "open";

    if (status !== "open" && status !== "closed") {
      errors.push({
        code: "invalid-job-status",
        path: [...path, "status"],
        message: "Job status must be open or closed.",
      });
    }

    if (!visibleOpen) return;

    if (typeof value.title !== "string" || !value.title.trim()) {
      errors.push({
        code: "missing-job-title",
        path: [...path, "title"],
        message: "Visible open jobs require a title.",
      });
    }
    if (typeof value.department !== "string" || !value.department.trim()) {
      errors.push({
        code: "missing-job-department",
        path: [...path, "department"],
        message: "Visible open jobs require a department.",
      });
    }
    if (typeof value.location !== "string" || !value.location.trim()) {
      errors.push({
        code: "missing-job-location",
        path: [...path, "location"],
        message: "Visible open jobs require a location.",
      });
    }
    if (!validIsoDate(value.postedDate)) {
      errors.push({
        code: "invalid-job-posted-date",
        path: [...path, "postedDate"],
        message:
          "Visible open jobs require a valid posted date in YYYY-MM-DD format.",
      });
    }

    const closingDate =
      typeof value.closingDate === "string" ? value.closingDate.trim() : "";
    if (closingDate && !validIsoDate(closingDate)) {
      errors.push({
        code: "invalid-job-closing-date",
        path: [...path, "closingDate"],
        message: "Job closing date must use YYYY-MM-DD format.",
      });
    } else if (
      closingDate &&
      validIsoDate(value.postedDate) &&
      closingDate < value.postedDate
    ) {
      errors.push({
        code: "job-closing-before-posted",
        path: [...path, "closingDate"],
        message: "Job closing date cannot be earlier than its posted date.",
      });
    }
  });

  return errors;
}

function validateFooterSocialLinks(
  siteDocument: JsonObject,
): CmsValidationError[] {
  const footer = isJsonObject(siteDocument.footer)
    ? siteDocument.footer
    : {};
  const entries = migrateSocialLinks(footer.socialLinks);
  const errors: CmsValidationError[] = [];
  const seen = new Set<string>();

  entries.forEach((entry, index) => {
    const path = ["footer", "socialLinks", index] as PathSegment[];
    if (!isSocialPlatform(entry.platform)) {
      errors.push({
        code: "unsupported-social-platform",
        path: [...path, "platform"],
        message: `Unsupported social platform “${entry.platform}”.`,
      });
      return;
    }

    if (seen.has(entry.platform)) {
      errors.push({
        code: "duplicate-social-platform",
        path: [...path, "platform"],
        message: `${entry.platform} can appear only once.`,
      });
    }
    seen.add(entry.platform);

    if (entry.enabled) {
      const result = validateSocialHref(entry.platform, entry.href);
      if (!result.valid) {
        errors.push({
          code: "invalid-social-url",
          path: [...path, "href"],
          message: result.message,
        });
      }
    }
  });

  return errors;
}

function validateFooterServiceReferences(
  siteDocument: JsonObject,
  servicesDraft: JsonObject | null,
  servicesPublished: JsonObject | null,
  publishingServices: boolean,
  sitePublished: JsonObject | null = null,
): CmsValidationError[] {
  const footer = isJsonObject(siteDocument.footer)
    ? siteDocument.footer
    : {};

  if (footer.selectedServiceIds === undefined) return [];
  if (!Array.isArray(footer.selectedServiceIds)) {
    return [
      {
        code: "invalid-service-reference",
        path: ["footer", "selectedServiceIds"],
        message: "Footer services must be an ordered ID list.",
      },
    ];
  }

  const selectedIds = footer.selectedServiceIds;
  const errors: CmsValidationError[] = [];
  if (selectedIds.length > MAX_FOOTER_SERVICES) {
    errors.push({
      code: "too-many-footer-services",
      path: ["footer", "selectedServiceIds"],
      message: `Choose no more than ${MAX_FOOTER_SERVICES} services.`,
    });
  }

  // Resolve against parents *and* sub-services: footer selections keep
  // their IDs when a service is re-parented under another one.
  const draftById = new Map(
    flattenServiceCatalogue(servicesDraft?.services).map((service) => [
      service.id,
      service,
    ]),
  );
  const publishedCatalogue = flattenServiceCatalogue(servicesPublished?.services);
  const publishedById = new Map(
    publishedCatalogue.map((service) => [service.id, service]),
  );
  // IDs are derived from a service's position and title until it is saved
  // with one, so the same service can carry different IDs in the draft and
  // the published catalogue. Its address (slug) is what the footer links
  // to, so a published service with the same slug counts as published.
  const publishedBySlug = new Map(
    publishedCatalogue
      .filter((service) => service.slug)
      .map((service) => [service.slug, service]),
  );
  // Selections already live on the site are not introduced by this
  // publish; blocking on them would stop every unrelated edit.
  const publishedSiteFooter = isJsonObject(sitePublished?.footer) ? sitePublished.footer : {};
  const alreadyLive = new Set(
    Array.isArray(publishedSiteFooter.selectedServiceIds)
      ? publishedSiteFooter.selectedServiceIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  );
  const seen = new Set<string>();

  selectedIds.forEach((value, index) => {
    const path = ["footer", "selectedServiceIds", index] as PathSegment[];
    if (typeof value !== "string" || !value.trim()) {
      errors.push({
        code: "invalid-service-reference",
        path,
        message: "Each selection must be a stable service ID.",
      });
      return;
    }

    if (seen.has(value)) {
      errors.push({
        code: "duplicate-service-reference",
        path,
        message: `Service “${value}” is selected more than once.`,
      });
    }
    seen.add(value);

    // Only selections this publish introduces are checked against the
    // catalogue; the footer skips missing or hidden services when it
    // renders, so a stale live selection never needs to block an
    // unrelated edit.
    if (alreadyLive.has(value) && !publishingServices) return;

    const draftService = draftById.get(value);
    if (!draftService) {
      errors.push({
        code: "unknown-service-reference",
        path,
        message: `Service “${value}” no longer exists.`,
      });
      return;
    }

    if (!draftService.visible) {
      errors.push({
        code: "hidden-service-reference",
        path,
        message: `Service “${draftService.title}” is hidden.`,
      });
      return;
    }

    const publishedService =
      publishedById.get(value) ??
      (draftService.slug ? publishedBySlug.get(draftService.slug) : undefined);
    if (
      !publishingServices &&
      (!publishedService || !publishedService.visible)
    ) {
      errors.push({
        code: "unpublished-service-reference",
        path,
        message: `Publish “${draftService.title}” from the Services page before publishing this footer selection.`,
      });
    }
  });

  return errors;
}

/**
 * Service addresses must be URL-safe and unique among their siblings.
 * Children are namespaced by parent, so two parents may each own a
 * sub-service with the same slug.
 */
function validateServiceSlugs(document: JsonObject): CmsValidationError[] {
  if (!Array.isArray(document.services)) return [];

  const errors: CmsValidationError[] = [];

  const check = (items: JsonValue[], basePath: PathSegment[]): void => {
    const seen = new Set<string>();
    items.forEach((value, index) => {
      if (!isJsonObject(value)) return;
      const path = [...basePath, index, "slug"];
      const slug = typeof value.slug === "string" ? value.slug : "";

      if (!SERVICE_SLUG_PATTERN.test(slug)) {
        errors.push({
          code: "invalid-service-slug",
          path,
          message:
            "Service address must use lowercase letters, numbers and hyphens.",
        });
      } else if (seen.has(slug)) {
        errors.push({
          code: "duplicate-service-slug",
          path,
          message: `Another service already uses the address "${slug}".`,
        });
      } else {
        seen.add(slug);
      }

      if (Array.isArray(value.children)) {
        check(value.children, [...basePath, index, "children"]);
      }
    });
  };

  check(document.services, ["services"]);
  return errors;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A blog post document, identified by shape: the validator only ever
 * receives the document itself, never its slug.
 */
function validateBlogPost(
  document: JsonObject,
  blogIndex: JsonObject | null,
): CmsValidationError[] {
  const looksLikePost =
    document.status !== undefined &&
    document.publishedAt !== undefined &&
    Array.isArray(document.body);
  if (!looksLikePost) return [];

  const errors: CmsValidationError[] = [];
  const title = typeof document.title === "string" ? document.title.trim() : "";
  if (!title) {
    errors.push({
      code: "missing-blog-title",
      path: ["title"],
      message: "Give the article a title.",
    });
  }

  const slug = typeof document.slug === "string" ? document.slug : "";
  if (!BLOG_SLUG_PATTERN.test(slug)) {
    errors.push({
      code: "invalid-blog-slug",
      path: ["slug"],
      message: "Article address must use lowercase letters, numbers and hyphens.",
    });
  }

  if (!ISO_DATE.test(String(document.publishedAt ?? ""))) {
    errors.push({
      code: "invalid-blog-date",
      path: ["publishedAt"],
      message: "Publication date must look like 2026-04-25.",
    });
  }

  if (document.status !== "draft" && document.status !== "published") {
    errors.push({
      code: "invalid-blog-status",
      path: ["status"],
      message: 'Status must be "draft" or "published".',
    });
  }

  const categories = Array.isArray(blogIndex?.categories)
    ? blogIndex.categories.filter(isJsonObject).map((entry) => entry.slug)
    : [];
  const category = typeof document.category === "string" ? document.category : "";
  if (category && categories.length && !categories.includes(category)) {
    errors.push({
      code: "unknown-blog-category",
      path: ["category"],
      message: `"${category}" is not one of the blog categories.`,
    });
  }

  const body = Array.isArray(document.body) ? document.body : [];
  if (document.status === "published" && body.length === 0) {
    errors.push({
      code: "empty-blog-body",
      path: ["body"],
      message: "Add some content before publishing this article.",
    });
  }

  body.forEach((value, index) => {
    if (!isJsonObject(value)) return;
    if (!(BLOCK_TYPES as readonly string[]).includes(String(value.type))) {
      errors.push({
        code: "unknown-block-type",
        path: ["body", index, "type"],
        message: `"${String(value.type)}" is not a supported block type.`,
      });
    }
  });

  return errors;
}

/**
 * A project document, identified by shape: the validator only ever
 * receives the document itself, never its slug.
 */
function validateProject(
  document: JsonObject,
  projectIndex: JsonObject | null,
  servicesPublished: JsonObject | null,
): CmsValidationError[] {
  const looksLikeProject =
    typeof document.status === "string" &&
    isJsonObject(document.facts) &&
    Array.isArray(document.serviceRefs);
  if (!looksLikeProject) return [];

  const errors: CmsValidationError[] = [];
  const title = typeof document.title === "string" ? document.title.trim() : "";
  if (!title) {
    errors.push({
      code: "missing-project-title",
      path: ["title"],
      message: "Give the project a title.",
    });
  }

  const slug = typeof document.slug === "string" ? document.slug : "";
  if (!PROJECT_SLUG_PATTERN.test(slug)) {
    errors.push({
      code: "invalid-project-slug",
      path: ["slug"],
      message: "Project address must use lowercase letters, numbers and hyphens.",
    });
  }

  if (document.status !== "draft" && document.status !== "published") {
    errors.push({
      code: "invalid-project-status",
      path: ["status"],
      message: 'Status must be "draft" or "published".',
    });
  }

  const categories = Array.isArray(projectIndex?.categories)
    ? projectIndex.categories.filter(isJsonObject).map((entry) => entry.slug)
    : [];
  const category = typeof document.category === "string" ? document.category : "";
  if (category && categories.length && !categories.includes(category)) {
    errors.push({
      code: "unknown-project-category",
      path: ["category"],
      message: `"${category}" is not one of the project categories.`,
    });
  }

  const serviceRefs = Array.isArray(document.serviceRefs)
    ? document.serviceRefs
    : [];
  if (servicesPublished) {
    // Resolve against parents *and* sub-services, and never against a
    // top-level-only lookup — that mistake once made the footer wrongly
    // report a re-parented service as missing.
    const catalogueBySlug = new Map(
      flattenServiceCatalogue(servicesPublished.services).map((service) => [
        service.slug,
        service,
      ]),
    );

    serviceRefs.forEach((value, index) => {
      if (!isJsonObject(value) || value.visible === false) return;
      const path = ["serviceRefs", index, "slug"] as PathSegment[];
      const refSlug = typeof value.slug === "string" ? value.slug : "";
      const service = catalogueBySlug.get(refSlug);
      if (!service) {
        errors.push({
          code: "unknown-project-service",
          path,
          message: `Service "${refSlug}" no longer exists.`,
        });
        return;
      }
      if (!service.visible) {
        errors.push({
          code: "hidden-project-service",
          path,
          message: `Service "${service.title}" is hidden.`,
        });
      }
    });
  }

  return errors;
}

const isParseableDate = (value: unknown): boolean =>
  typeof value === "string" &&
  value.trim() !== "" &&
  !Number.isNaN(Date.parse(value));

/**
 * The updates document, identified by shape: it holds every entry inline
 * (there is no per-update document), so the validator only ever sees the
 * document itself, never a slug.
 */
function validateUpdates(document: JsonObject): CmsValidationError[] {
  if (!Array.isArray(document.entries) || !Array.isArray(document.types)) {
    return [];
  }
  const entries = document.entries;
  const types = document.types;

  const errors: CmsValidationError[] = [];
  const typeSlugs = types
    .filter(isJsonObject)
    .map((type) => type.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug !== "");

  entries.forEach((value, index) => {
    if (!isJsonObject(value)) return;
    const path = ["entries", index] as PathSegment[];

    if (typeof value.headline !== "string" || !value.headline.trim()) {
      errors.push({
        code: "missing-update-headline",
        path: [...path, "headline"],
        message: "Give the update a headline.",
      });
    }

    if (!isParseableDate(value.postedAt)) {
      errors.push({
        code: "invalid-update-date",
        path: [...path, "postedAt"],
        message: "Posted date must be a valid date.",
      });
    }

    if (value.status !== "draft" && value.status !== "published") {
      errors.push({
        code: "invalid-update-status",
        path: [...path, "status"],
        message: 'Status must be "draft" or "published".',
      });
    }

    const type = typeof value.type === "string" ? value.type : "";
    if (type && typeSlugs.length > 0 && !typeSlugs.includes(type)) {
      errors.push({
        code: "unknown-update-type",
        path: [...path, "type"],
        message: `"${type}" is not one of the update types.`,
      });
    }
  });

  return errors;
}

const RELATED_DOCUMENT_LABELS: Record<string, string> = {
  projects: "Projects page settings",
  services: "Services catalogue",
  blogs: "Blog page settings",
};

/** How an error names the document it came from, for the toolbar. */
export const relatedDocumentLabel = (slug: string): string =>
  RELATED_DOCUMENT_LABELS[slug] ?? `“${slug}” document`;

/**
 * The structural pass (stable IDs, safe URLs, animation values) for a
 * document edited alongside the page through a `doc:` scope. Only the
 * shape-agnostic checks run — blog, project and careers rules describe
 * the page being edited, not its related documents. Messages name the
 * document, because the toolbar shows messages, not paths.
 */
export function validateRelatedDocument(
  slug: string,
  document: JsonObject,
): CmsValidationError[] {
  const label = relatedDocumentLabel(slug);
  return validateDocument(document, "page").map((error) => ({
    ...error,
    message: `${label}: ${error.message.replace(/ at page\./, " at ")}`,
    document: slug,
  }));
}

/** `site.theme`: a known preset and `#rrggbb` (or empty) colour overrides. */
export function validateSiteTheme(siteDocument: JsonObject): CmsValidationError[] {
  const theme = siteDocument.theme;
  if (theme === undefined) return [];
  if (!isJsonObject(theme)) {
    return [{ code: "unknown-theme-preset", path: ["theme"], message: "Theme settings are malformed." }];
  }
  const errors: CmsValidationError[] = [];
  if (theme.scheme !== undefined && !THEME_PRESETS.some((preset) => preset.id === theme.scheme)) {
    errors.push({
      code: "unknown-theme-preset",
      path: ["theme", "scheme"],
      message: `Unknown colour scheme “${String(theme.scheme)}”.`,
    });
  }
  if (theme.fonts !== undefined) {
    const fonts = isJsonObject(theme.fonts) ? theme.fonts : {};
    for (const role of ["body", "heading"] as const) {
      const value = fonts[role];
      if (value === undefined || value === "" || FONT_OPTIONS.some((font) => font.id === value)) continue;
      errors.push({
        code: "unknown-theme-font",
        path: ["theme", "fonts", role],
        message: `Unknown ${role} font “${String(value)}”.`,
      });
    }
  }
  for (const mode of ["light", "dark"] as const) {
    const palette = theme[mode];
    if (palette === undefined) continue;
    if (!isJsonObject(palette)) {
      errors.push({ code: "invalid-theme-color", path: ["theme", mode], message: `The ${mode} palette is malformed.` });
      continue;
    }
    for (const key of THEME_COLOR_KEYS) {
      const value = palette[key];
      if (value === undefined || value === "" || isHexColor(value)) continue;
      errors.push({
        code: "invalid-theme-color",
        path: ["theme", mode, key],
        message: `${THEME_COLOR_LABELS[key].label} (${mode}) must be a colour like #15803d.`,
      });
    }
  }
  return errors;
}

export function validateCmsDocuments(
  pageDocument: JsonObject | null,
  siteDocument: JsonObject | null,
  related: {
    servicesDraft?: JsonObject | null;
    servicesPublished?: JsonObject | null;
    publishingServices?: boolean;
    /** The live site document: footer selections already there are not re-checked for publication. */
    sitePublished?: JsonObject | null;
    blogIndexDraft?: JsonObject | null;
    projectIndexDraft?: JsonObject | null;
  } = {},
): CmsValidationError[] {
  const inPage = (errors: CmsValidationError[]) =>
    errors.map((error) => ({ ...error, document: error.document ?? "page" }));
  const inSite = (errors: CmsValidationError[]) =>
    errors.map((error) => ({ ...error, document: error.document ?? "site" }));
  return [
    ...inPage([
    ...(pageDocument ? validateDocument(pageDocument, "page") : []),
    ...(pageDocument ? validateCareersDocument(pageDocument) : []),
    ...(pageDocument ? validateServiceSlugs(pageDocument) : []),
    ...(pageDocument
      ? validateBlogPost(pageDocument, related.blogIndexDraft ?? null)
      : []),
    ...(pageDocument
      ? validateProject(
          pageDocument,
          related.projectIndexDraft ?? null,
          related.servicesPublished ?? null,
        )
      : []),
    ...(pageDocument ? validateUpdates(pageDocument) : []),
    ]),
    ...inSite([
    ...(siteDocument ? validateDocument(siteDocument, "site") : []),
    ...(siteDocument ? validateFooterSocialLinks(siteDocument) : []),
    ...(siteDocument ? validateSiteTheme(siteDocument) : []),
    ...(siteDocument
      ? validateFooterServiceReferences(
          siteDocument,
          related.servicesDraft ?? null,
          related.servicesPublished ?? null,
          related.publishingServices === true,
          related.sitePublished ?? null,
        )
      : []),
    ]),
  ];
}

export class CmsDocumentValidationError extends Error {
  readonly errors: CmsValidationError[];

  constructor(errors: CmsValidationError[]) {
    super(
      `CMS document validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}.`,
    );
    this.name = "CmsDocumentValidationError";
    this.errors = errors;
  }
}
