import type { JsonObject } from "@/components/cms/json";
import { serviceHref } from "@/components/services/serviceCatalog";
import { flattenServiceCatalogue } from "@/components/services/serviceHierarchy";
import { assetSrc } from "@/content/types";
import type { Project, ProjectFacts } from "./projectModel";

export interface ProjectServiceChip {
  slug: string;
  title: string;
  href: string;
}

export interface ServiceChoiceGroup {
  /** The parent service; its own slug is the first option. */
  title: string;
  options: { slug: string; title: string }[];
}

export type FactKey = Exclude<keyof ProjectFacts, "valueVisible">;

export interface FactRow {
  key: FactKey;
  label: string;
  /** The label's field under the index document's `detail` section. */
  labelField: string;
  value: string;
}

export interface GalleryItem {
  id: string;
  src: unknown;
  alt: string;
  /** Position in the stored array — edit paths must use this, not the render order. */
  index: number;
}

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * The project's service references as links. Resolution goes through the
 * same flattened catalogue that validation uses, so a chip exists exactly
 * when the reference would pass a publish: unknown or hidden services
 * (a sub-service of a hidden parent included) are dropped, not linked.
 */
export function resolveProjectServices(
  refs: string[],
  servicesDocument: JsonObject,
): ProjectServiceChip[] {
  const catalogue = new Map(
    flattenServiceCatalogue(servicesDocument.services).map((entry) => [entry.slug, entry]),
  );
  return refs.flatMap((slug) => {
    const entry = catalogue.get(slug);
    if (!slug || !entry || !entry.visible) return [];
    return [
      {
        slug,
        title: entry.title || slug,
        href: serviceHref({ slug, parentSlug: entry.parentSlug }),
      },
    ];
  });
}

/**
 * What an editor may add: visible catalogue entries not already chosen,
 * grouped under their parent so the picker mirrors the navbar.
 */
export function serviceChoices(
  servicesDocument: JsonObject,
  taken: string[],
): ServiceChoiceGroup[] {
  const chosen = new Set(taken);
  const entries = flattenServiceCatalogue(servicesDocument.services).filter(
    (entry) => entry.visible && entry.slug && !chosen.has(entry.slug),
  );
  const parents = flattenServiceCatalogue(servicesDocument.services).filter(
    (entry) => entry.parentSlug === null && entry.visible && entry.slug,
  );

  return parents
    .map((parent) => ({
      title: parent.title || parent.slug,
      options: entries
        .filter((entry) =>
          entry.parentSlug === null ? entry.slug === parent.slug : entry.parentSlug === parent.slug,
        )
        .map((entry) => ({ slug: entry.slug, title: entry.title || entry.slug })),
    }))
    .filter((group) => group.options.length > 0);
}

const FACT_ORDER: { key: FactKey; label: string; fallback: string }[] = [
  { key: "client", label: "clientLabel", fallback: "Client" },
  { key: "consultant", label: "consultantLabel", fallback: "Consultant" },
  { key: "value", label: "valueLabel", fallback: "Contract Value" },
  { key: "location", label: "locationLabel", fallback: "Location" },
  { key: "area", label: "areaLabel", fallback: "Area" },
  { key: "duration", label: "durationLabel", fallback: "Duration" },
  { key: "completedOn", label: "completedLabel", fallback: "Completion" },
  { key: "projectStatus", label: "statusLabel", fallback: "Status" },
];

/**
 * The facts panel rows. Visitors see only filled rows, and the contract
 * value only when an editor has chosen to show it. An editor sees every
 * row so an empty one can be filled in place.
 */
export function factRows(
  facts: ProjectFacts,
  labels: JsonObject,
  editing: boolean,
): FactRow[] {
  return FACT_ORDER.flatMap(({ key, label, fallback }) => {
    const value = facts[key];
    if (!editing) {
      if (!value.trim()) return [];
      if (key === "value" && !facts.valueVisible) return [];
    }
    return [{ key, label: text(labels[label]) || fallback, labelField: label, value }];
  });
}

/** Gallery entries to render, with their stored index kept for edit paths. */
export function galleryItems(gallery: unknown, editing: boolean): GalleryItem[] {
  return (Array.isArray(gallery) ? gallery : []).flatMap((value, index) => {
    const image = asObject(value);
    if (!image) return [];
    if (!editing && (image.visible === false || !assetSrc(image.src))) return [];
    return [
      {
        id: text(image.id) || `image-${index}`,
        src: image.src,
        alt: text(image.alt),
        index,
      },
    ];
  });
}

const ISO_DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** An ISO 8601 date (year, year-month or full date) or nothing — never guessed. */
const isoDate = (value: string): string | undefined => {
  const trimmed = value.trim();
  return ISO_DATE_RE.test(trimmed) && !Number.isNaN(Date.parse(trimmed))
    ? trimmed
    : undefined;
};

/**
 * schema.org structured data for a published project. `CreativeWork`, not
 * `Project`: schema.org's Project is an organisation (a funded research
 * programme), not a piece of delivered work. Client and contract value are
 * deliberately never included — they are editorial choices on the page,
 * and structured data would outlive a later decision to hide them.
 */
export function projectJsonLd(
  project: Project,
  site: { url: string; name: string },
): JsonObject {
  const hero = typeof project.hero === "string" ? project.hero : "";
  const image = hero ? (/^https?:\/\//.test(hero) ? hero : `${site.url}${hero}`) : undefined;
  const location = project.facts.location.trim();
  const dateCreated = isoDate(project.facts.completedOn);

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: `${site.url}${project.href}`,
    creator: { "@type": "Organization", name: site.name, url: site.url },
    ...(image ? { image } : {}),
    ...(location ? { locationCreated: { "@type": "Place", name: location } } : {}),
    ...(dateCreated ? { dateCreated } : {}),
  };
}
