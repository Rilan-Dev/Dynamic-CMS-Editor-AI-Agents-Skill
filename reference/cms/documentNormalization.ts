import { migrateSocialLinks } from "@/components/footer/socialLinks";
import { blogSlugFromDocument, isBlogDocument } from "@/components/blog/blogSlug";
import { readingMinutes } from "@/components/blog/readingTime";
import {
  isProjectDocument,
  projectSlugFromDocument,
} from "@/components/projects/projectSlug";
import { uniqueServiceSlugs } from "@/components/services/serviceSlug";
import { defaultServiceDetail } from "@/content/serviceDetailDefaults";
import type { JsonArray, JsonObject, JsonValue, PathSegment } from "./json";

const VISIBLE_ARRAY_KEYS = new Set([
  "links",
  "columns",
  "items",
  "socialLinks",
  "contactItems",
  "legalLinks",
  "registrations",
  "isoCertifications",
  "services",
  "clients",
  "groupCompanies",
  "infoCards",
  "benefits",
  "cards",
  "principles",
  "highlights",
  "jobs",
  "steps",
  "children",
  "points",
  "body",
  "posts",
  "gallery",
  "serviceRefs",
  "scope",
  "categories",
  "entries",
  "types",
]);

const isJsonObject = (value: JsonValue): value is JsonObject =>
  !!value && typeof value === "object" && !Array.isArray(value);

const hashText = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const identifyingText = (item: JsonObject): string => {
  for (const key of ["title", "name", "label", "heading", "text"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "item";
};

export function stableCmsId(
  slug: string,
  path: PathSegment[],
  item: JsonObject,
  index = 0,
): string {
  const label = slugify(identifyingText(item)) || "item";
  const fingerprint = JSON.stringify({
    slug,
    path: path.map(String),
    index,
    label,
    href: typeof item.href === "string" ? item.href : "",
    image: typeof item.image === "string" ? item.image : "",
  });
  return `${label}-${hashText(fingerprint)}`;
}

const normalizeValue = (
  slug: string,
  path: PathSegment[],
  value: JsonValue,
): JsonValue => {
  if (Array.isArray(value)) {
    const arrayKey = String(path.at(-1) ?? "");
    return value.map((entry, index) => {
      const normalizedEntry = normalizeValue(slug, [...path, index], entry);
      if (!isJsonObject(normalizedEntry)) return normalizedEntry;

      const id =
        typeof normalizedEntry.id === "string" && normalizedEntry.id.trim()
          ? normalizedEntry.id
          : stableCmsId(slug, path, normalizedEntry, index);
      const next: JsonObject = { ...normalizedEntry, id };
      if (VISIBLE_ARRAY_KEYS.has(arrayKey) && typeof next.visible !== "boolean") {
        next.visible = true;
      }
      return next;
    }) as JsonArray;
  }

  if (isJsonObject(value)) {
    const next: JsonObject = {};
    Object.entries(value).forEach(([key, child]) => {
      next[key] = normalizeValue(slug, [...path, key], child);
    });
    return next;
  }

  return value;
};

const pageAnimationDefaults = (): JsonObject => ({
  page: { mode: "inherit" },
  sections: {},
  components: {},
});

const siteAnimationDefaults = (): JsonObject => ({
  global: {
    enabled: true,
    mode: "override",
    preset: "none",
    trigger: "in-view",
    timing: {
      durationMs: 600,
      delayMs: 0,
      staggerMs: 0,
      easing: "ease-out",
    },
    viewport: {
      threshold: 0.15,
      rootMargin: "0px 0px -10% 0px",
      once: true,
      replayOnReentry: false,
      reverseOnExit: false,
    },
    devices: {
      desktop: true,
      tablet: true,
      mobile: true,
      reducedMotion: "disable",
    },
  },
  defaultsByType: {
    heading: { mode: "inherit" },
    text: { mode: "inherit" },
    image: { mode: "inherit" },
    button: { mode: "inherit" },
    card: { mode: "inherit" },
    icon: { mode: "inherit" },
    listItem: { mode: "inherit" },
  },
  pageTransition: {
    enabled: false,
    preset: "fade",
    enterDurationMs: 300,
    exitDurationMs: 220,
    easing: "ease-in-out",
    showOverlay: false,
    overlayBackground: "#ffffff",
    overlayLogo: { src: "", alt: "" },
    directionAware: false,
    excludedPaths: [],
    reducedMotion: "disable",
  },
});

const asStringArray = (value: JsonValue): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const hasHref = (items: JsonValue[], href: string): boolean =>
  items.some((item) => isJsonObject(item) && item.href === href);

const ensureCareersLink = (
  items: JsonValue[],
  labelKey: "name" | "label",
): JsonArray => {
  if (hasHref(items, "/careers")) return items as JsonArray;
  return [
    ...items,
    {
      [labelKey]: "Careers",
      href: "/careers",
      icon: "BriefcaseBusiness",
      target: "_self",
      visible: true,
    },
  ] as JsonArray;
};

const ensureBlogsLink = (
  items: JsonValue[],
  labelKey: "name" | "label",
): JsonArray => {
  if (hasHref(items, "/blogs")) return items as JsonArray;
  return [
    ...items,
    {
      [labelKey]: "Blog",
      href: "/blogs",
      icon: "FileText",
      target: "_self",
      visible: true,
    },
  ] as JsonArray;
};

/**
 * Unlike Careers and Blog, Updates is inserted right after Blog (or at the
 * end when there is no Blog link), so it reads as the next content type in
 * the navigation rather than trailing after Careers.
 */
const ensureUpdatesLink = (
  items: JsonValue[],
  labelKey: "name" | "label",
): JsonArray => {
  if (hasHref(items, "/updates")) return items as JsonArray;
  const link: JsonObject = {
    [labelKey]: "Updates",
    href: "/updates",
    icon: "Megaphone",
    target: "_self",
    visible: true,
  };
  const blogIndex = items.findIndex(
    (item) => isJsonObject(item) && item.href === "/blogs",
  );
  if (blogIndex === -1) return [...items, link] as JsonArray;
  return [
    ...items.slice(0, blogIndex + 1),
    link,
    ...items.slice(blogIndex + 1),
  ] as JsonArray;
};

/**
 * Unlike Careers and Blog, which are appended at the end, Projects sits
 * next to Services in the navigation — inserted right after it, or at the
 * end when no Services link is present.
 */
const ensureProjectsLink = (
  items: JsonValue[],
  labelKey: "name" | "label",
): JsonArray => {
  if (hasHref(items, "/projects")) return items as JsonArray;
  const link: JsonObject = {
    [labelKey]: "Projects",
    href: "/projects",
    icon: "Building2",
    target: "_self",
    visible: true,
  };
  const servicesIndex = items.findIndex(
    (item) => isJsonObject(item) && item.href === "/services",
  );
  if (servicesIndex === -1) return [...items, link] as JsonArray;
  return [
    ...items.slice(0, servicesIndex + 1),
    link,
    ...items.slice(servicesIndex + 1),
  ] as JsonArray;
};

const migrateSiteChrome = (document: JsonObject): JsonObject => {
  const next = { ...document };
  const navbar = isJsonObject(next.navbar) ? { ...next.navbar } : {};
  const footer = isJsonObject(next.footer) ? { ...next.footer } : {};

  if (!isJsonObject(navbar.brand)) {
    navbar.brand = {
      prefix: "SM",
      highlight: "TS",
      suffix: " Contracting LLC",
      href: "/",
    };
  }
  if (!Array.isArray(navbar.links)) navbar.links = [];
  navbar.links = ensureUpdatesLink(
    ensureBlogsLink(
      ensureCareersLink(
        ensureProjectsLink(navbar.links as JsonValue[], "name"),
        "name",
      ),
      "name",
    ),
    "name",
  );
  navbar.phone =
    typeof navbar.phone === "string" ? navbar.phone : "+97142615654";
  navbar.phoneIcon =
    typeof navbar.phoneIcon === "string" ? navbar.phoneIcon : "Phone";
  if (!isJsonObject(navbar.quoteButton)) {
    navbar.quoteButton = {
      label: "Get a Quote",
      href: "/contact",
      icon: "ArrowRight",
      visible: true,
    };
  }
  navbar.mobileMenuLabel =
    typeof navbar.mobileMenuLabel === "string"
      ? navbar.mobileMenuLabel
      : "Toggle menu";
  next.navbar = navbar;

  footer.logoHref = typeof footer.logoHref === "string" ? footer.logoHref : "/";
  footer.company =
    typeof footer.company === "string" ? footer.company : "SMTS Contracting LLC";
  footer.description =
    typeof footer.description === "string" ? footer.description : "";

  if (!Array.isArray(footer.columns)) {
    const legacyLinks = Array.isArray(footer.links)
      ? footer.links.map((entry) => {
          const link = isJsonObject(entry) ? entry : {};
          return {
            label:
              typeof link.label === "string"
                ? link.label
                : typeof link.text === "string"
                  ? link.text
                  : "Link",
            href: typeof link.href === "string" ? link.href : "/",
            icon: typeof link.icon === "string" ? link.icon : "ChevronRight",
            target: typeof link.target === "string" ? link.target : "_self",
            visible: typeof link.visible === "boolean" ? link.visible : true,
          } as JsonObject;
        })
      : [];
    const addressLines = asStringArray(footer.address);
    const email =
      typeof footer.email === "string"
        ? footer.email
        : "info@smtscontracting.com";

    footer.columns = [
      {
        heading: footer.company,
        type: "links",
        links: legacyLinks,
      },
      {
        heading: "Our Services",
        type: "links",
        links: [
          "Building Contracting",
          "Building Maintenance",
          "Steel Structure Fabrication",
          "Plumbing Works",
          "Electrical Works",
          "Interior Works",
          "Landscaping Works",
        ].map((label) => ({
          label,
          href: "/services",
          icon: "ChevronRight",
          target: "_self",
          visible: true,
        })),
      },
      {
        heading: "Contact Us",
        type: "contact",
        contactItems: [
          {
            label: "Address",
            value: addressLines.join("\n"),
            href: "",
            icon: "MapPin",
            multiline: true,
            visible: true,
          },
          {
            label: "Phone",
            value: "+97142615654",
            href: "tel:+97142615654",
            icon: "Phone",
            multiline: false,
            visible: true,
          },
          {
            label: "Email",
            value: email,
            href: `mailto:${email}`,
            icon: "Mail",
            multiline: false,
            visible: true,
          },
        ],
      },
    ];
  }

  const columns = (footer.columns as JsonValue[]).map((value) => {
    if (!isJsonObject(value)) return value;
    const heading =
      typeof value.heading === "string"
        ? value.heading.toLowerCase().trim()
        : "";
    return heading === "our services"
      ? { ...value, type: "serviceReferences" }
      : value;
  }) as JsonArray;

  const footerHasCareers = columns.some(
    (value) =>
      isJsonObject(value) &&
      Array.isArray(value.links) &&
      hasHref(value.links as JsonValue[], "/careers"),
  );

  if (!footerHasCareers) {
    const quickLinksIndex = columns.findIndex((value) => {
      if (!isJsonObject(value) || value.type !== "links") return false;
      const heading =
        typeof value.heading === "string"
          ? value.heading.toLowerCase().trim()
          : "";
      return heading !== "our services";
    });

    if (quickLinksIndex >= 0) {
      const quickLinks = columns[quickLinksIndex] as JsonObject;
      columns[quickLinksIndex] = {
        ...quickLinks,
        links: ensureUpdatesLink(
          ensureBlogsLink(
            ensureCareersLink(
              ensureProjectsLink(
                Array.isArray(quickLinks.links)
                  ? (quickLinks.links as JsonValue[])
                  : [],
                "label",
              ),
              "label",
            ),
            "label",
          ),
          "label",
        ),
      };
    }
  }

  footer.columns = columns;

  if (!Array.isArray(footer.socialLinks)) {
    footer.socialLinks = [
      {
        label: "Facebook",
        href: "https://facebook.com",
        icon: "Facebook",
        visible: true,
      },
      {
        label: "Instagram",
        href: "https://instagram.com",
        icon: "Instagram",
        visible: true,
      },
      {
        label: "LinkedIn",
        href: "https://linkedin.com",
        icon: "Linkedin",
        visible: true,
      },
    ];
  }
  footer.socialLinks = migrateSocialLinks(
    footer.socialLinks,
  ) as unknown as JsonArray;

  if (!isJsonObject(footer.copyright)) {
    footer.copyright = {
      template: "© {year} {company}. All Rights Reserved.",
      company: footer.company,
    };
  }
  if (!Array.isArray(footer.legalLinks)) {
    footer.legalLinks = [
      { label: "Privacy Policy", href: "/privacy-policy", visible: true },
      { label: "Terms of Service", href: "/terms-of-service", visible: true },
    ];
  }
  if (!isJsonObject(footer.whatsapp)) {
    footer.whatsapp = {
      enabled: true,
      href: "https://wa.me/971559362618",
      label: "Chat on WhatsApp",
      icon: "MessageCircle",
    };
  }

  delete footer.links;
  delete footer.email;
  delete footer.address;
  next.footer = footer;
  return next;
};

export const SERVICES_SCHEMA_VERSION = 2;

const titleKey = (value: unknown): string =>
  typeof value === "string"
    ? value.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").trim()
    : "";

/** Existing flat services that become sub-services of another service. */
const SERVICE_REPARENTING: Record<string, string> = {
  "building maintenance": "building contracting",
  "interior works": "building contracting",
  "steel structure fabrication": "shade installation",
  "plumbing works": "electrical works",
  "industrial floor screeding": "epoxy floor painting",
  "climate control installation": "greenhouse installation",
  "retractable roof installation": "greenhouse installation",
};

/** Sub-services introduced with the hierarchy, seeded once. */
const NEW_SUB_SERVICES: { parent: string; service: JsonObject }[] = [
  {
    parent: "building contracting",
    service: {
      title: "Villa Construction",
      description:
        "End-to-end villa construction, from foundations and structure to finishes and handover.",
      icon: "/images/services-icons/building-contracting.svg",
      image: "/images/services/services-buildcontract.jpeg",
    },
  },
  {
    parent: "building contracting",
    service: {
      title: "Meet Me Room",
      description:
        "Purpose-built meet-me rooms with the containment, power and cooling that carrier interconnects require.",
      icon: "/images/services-icons/building-contracting.svg",
      image: "/images/services/services-buildcontract.jpeg",
    },
  },
  {
    parent: "building contracting",
    service: {
      title: "Service Block",
      description:
        "Service blocks delivered as a complete package — structure, MEP and finishes coordinated on one programme.",
      icon: "/images/services-icons/building-contracting.svg",
      image: "/images/services/services-buildcontract.jpeg",
    },
  },
];

/**
 * One-time conversion of the flat services list into the two-level
 * hierarchy. Guarded by a schema stamp so an editor's later deletions
 * are never undone. Re-parented services keep their ids, so existing
 * footer service references continue to resolve.
 */
const migrateServiceHierarchy = (document: JsonObject): JsonObject => {
  const stamped =
    typeof document.servicesSchema === "number" &&
    document.servicesSchema >= SERVICES_SCHEMA_VERSION;
  if (stamped || !Array.isArray(document.services)) {
    return stamped
      ? document
      : { ...document, servicesSchema: SERVICES_SCHEMA_VERSION };
  }

  const list = document.services.filter(isJsonObject);
  const parents = list.filter(
    (service) => !SERVICE_REPARENTING[titleKey(service.title)],
  );
  const parentIndexByTitle = new Map(
    parents.map((service, index) => [titleKey(service.title), index]),
  );
  const childrenByParent = parents.map((service) =>
    Array.isArray(service.children) ? service.children.filter(isJsonObject) : [],
  );

  // Seed first, then re-parent, so the new sub-services lead the list.
  for (const { parent, service } of NEW_SUB_SERVICES) {
    const index = parentIndexByTitle.get(parent);
    if (index === undefined) continue;
    const present = childrenByParent[index].some(
      (child) => titleKey(child.title) === titleKey(service.title),
    );
    if (present) continue;
    childrenByParent[index] = [...childrenByParent[index], { ...service }];
  }

  for (const service of list) {
    const parentTitle = SERVICE_REPARENTING[titleKey(service.title)];
    if (!parentTitle) continue;
    const index = parentIndexByTitle.get(parentTitle);
    if (index === undefined) continue;
    childrenByParent[index] = [...childrenByParent[index], service];
  }

  return {
    ...document,
    servicesSchema: SERVICES_SCHEMA_VERSION,
    services: parents.map((service, index) =>
      childrenByParent[index].length
        ? { ...service, children: childrenByParent[index] }
        : service,
    ),
  };
};

const seedDetail = (service: JsonObject): JsonObject => {
  if (isJsonObject(service.detail)) return service;
  return {
    ...service,
    detail: defaultServiceDetail({
      title: typeof service.title === "string" ? service.title : "Service",
      description:
        typeof service.description === "string" ? service.description : "",
      image: service.image,
    }),
  };
};

/** Give every service and sub-service a slug and a detail document. */
const seedServiceFields = (document: JsonObject): JsonObject => {
  if (!Array.isArray(document.services)) return document;
  const services = document.services.filter(isJsonObject);
  const slugs = uniqueServiceSlugs(services);

  return {
    ...document,
    services: services.map((service, index) => {
      const children = Array.isArray(service.children)
        ? service.children.filter(isJsonObject)
        : [];
      const childSlugs = uniqueServiceSlugs(children);
      const next = seedDetail({ ...service, slug: slugs[index] });
      return children.length
        ? {
            ...next,
            children: children.map((child, childIndex) =>
              seedDetail({ ...child, slug: childSlugs[childIndex] }),
            ),
          }
        : next;
    }),
  };
};

const seedBlogPost = (slug: string, document: JsonObject): JsonObject => {
  const body = Array.isArray(document.body) ? document.body : [];
  return {
    ...document,
    slug: typeof document.slug === "string" && document.slug ? document.slug : slug,
    status: document.status === "published" ? "published" : "draft",
    publishedAt:
      typeof document.publishedAt === "string" && document.publishedAt
        ? document.publishedAt
        : new Date().toISOString().slice(0, 10),
    readingMinutes:
      typeof document.readingMinutes === "number" && document.readingMinutes > 0
        ? document.readingMinutes
        : readingMinutes(body),
    body,
  };
};

const seedBlogIndex = (document: JsonObject): JsonObject => ({
  ...document,
  posts: Array.isArray(document.posts) ? document.posts : [],
});

const seedProject = (slug: string, document: JsonObject): JsonObject => {
  const facts = isJsonObject(document.facts) ? document.facts : {};
  return {
    ...document,
    slug:
      typeof document.slug === "string" && document.slug ? document.slug : slug,
    status: document.status === "published" ? "published" : "draft",
    facts: {
      ...facts,
      valueVisible: facts.valueVisible === true,
    },
    scope: Array.isArray(document.scope) ? document.scope : [],
    gallery: Array.isArray(document.gallery) ? document.gallery : [],
    serviceRefs: Array.isArray(document.serviceRefs) ? document.serviceRefs : [],
  };
};

const seedProjectIndex = (document: JsonObject): JsonObject => ({
  ...document,
  projects: Array.isArray(document.projects) ? document.projects : [],
});

/**
 * Every entry needs a status, a pinned flag and a real timestamp so the
 * feed can sort and filter it — an editor-supplied invalid or missing
 * postedAt is stamped with the current time rather than left unsortable.
 */
const seedUpdatesIndex = (document: JsonObject): JsonObject => ({
  ...document,
  entries: (Array.isArray(document.entries) ? document.entries : []).map(
    (entry) => {
      if (!isJsonObject(entry)) return entry;
      const postedAt =
        typeof entry.postedAt === "string" &&
        entry.postedAt.trim() &&
        !Number.isNaN(Date.parse(entry.postedAt))
          ? entry.postedAt
          : new Date().toISOString();
      return {
        ...entry,
        status: entry.status === "published" ? "published" : "draft",
        pinned: entry.pinned === true,
        postedAt,
      };
    },
  ),
});

export function normalizeCmsDocument(
  slug: string,
  document: JsonObject,
): JsonObject {
  const migrated = slug === "site" ? migrateSiteChrome(document) : document;
  const normalized = normalizeValue(slug, [], migrated) as JsonObject;
  const existingAnimations = isJsonObject(normalized.animations)
    ? normalized.animations
    : {};

  if (slug === "site") {
    const defaults = siteAnimationDefaults();
    normalized.animations = {
      ...defaults,
      ...existingAnimations,
      global: {
        ...(defaults.global as JsonObject),
        ...(isJsonObject(existingAnimations.global)
          ? existingAnimations.global
          : {}),
      },
      defaultsByType: {
        ...(defaults.defaultsByType as JsonObject),
        ...(isJsonObject(existingAnimations.defaultsByType)
          ? existingAnimations.defaultsByType
          : {}),
      },
      pageTransition: {
        ...(defaults.pageTransition as JsonObject),
        ...(isJsonObject(existingAnimations.pageTransition)
          ? existingAnimations.pageTransition
          : {}),
      },
    };
  } else {
    const defaults = pageAnimationDefaults();
    normalized.animations = {
      ...defaults,
      ...existingAnimations,
      page: {
        ...(defaults.page as JsonObject),
        ...(isJsonObject(existingAnimations.page)
          ? existingAnimations.page
          : {}),
      },
      sections: isJsonObject(existingAnimations.sections)
        ? existingAnimations.sections
        : {},
      components: isJsonObject(existingAnimations.components)
        ? existingAnimations.components
        : {},
    };
  }

  let withContentDefaults = normalized;
  if (slug === "services") {
    withContentDefaults = seedServiceFields(migrateServiceHierarchy(normalized));
  } else if (slug === "blogs") {
    withContentDefaults = seedBlogIndex(normalized);
  } else if (isBlogDocument(slug)) {
    withContentDefaults = seedBlogPost(
      blogSlugFromDocument(slug) ?? "post",
      normalized,
    );
  } else if (slug === "projects") {
    withContentDefaults = seedProjectIndex(normalized);
  } else if (isProjectDocument(slug)) {
    withContentDefaults = seedProject(
      projectSlugFromDocument(slug) ?? "project",
      normalized,
    );
  } else if (slug === "updates") {
    withContentDefaults = seedUpdatesIndex(normalized);
  }

  return normalizeValue(slug, [], withContentDefaults) as JsonObject;
}
