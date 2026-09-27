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
  orderServices,
} from "@/components/services/serviceCatalog";
import type { JsonObject, JsonValue, PathSegment } from "./json";

export type CmsValidationCode =
  | "unsafe-url"
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
  | "invalid-career-email"
  | "invalid-job-status"
  | "missing-job-title"
  | "missing-job-department"
  | "missing-job-location"
  | "invalid-job-posted-date"
  | "invalid-job-closing-date"
  | "job-closing-before-posted";

export interface CmsValidationError {
  code: CmsValidationCode;
  path: PathSegment[];
  message: string;
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

const validateDocument = (document: JsonObject, scope: "page" | "site") => {
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

  const draftById = new Map(
    orderServices(servicesDraft?.services).map((service) => [
      service.id,
      service,
    ]),
  );
  const publishedById = new Map(
    orderServices(servicesPublished?.services).map((service) => [
      service.id,
      service,
    ]),
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

    const publishedService = publishedById.get(value);
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

export function validateCmsDocuments(
  pageDocument: JsonObject | null,
  siteDocument: JsonObject | null,
  related: {
    servicesDraft?: JsonObject | null;
    servicesPublished?: JsonObject | null;
    publishingServices?: boolean;
  } = {},
): CmsValidationError[] {
  return [
    ...(pageDocument ? validateDocument(pageDocument, "page") : []),
    ...(pageDocument ? validateCareersDocument(pageDocument) : []),
    ...(siteDocument ? validateDocument(siteDocument, "site") : []),
    ...(siteDocument ? validateFooterSocialLinks(siteDocument) : []),
    ...(siteDocument
      ? validateFooterServiceReferences(
          siteDocument,
          related.servicesDraft ?? null,
          related.servicesPublished ?? null,
          related.publishingServices === true,
        )
      : []),
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
