import type { JsonObject } from "@/components/cms/json";
import { BLOCK_TYPES } from "@/components/blog/blogModel";
import { projectSlugFromDocument } from "./projectSlug";

export interface ProjectFacts {
  client: string;
  consultant: string;
  value: string;
  /** Contract value is a tender credential, hidden unless an editor shows it. */
  valueVisible: boolean;
  location: string;
  area: string;
  duration: string;
  completedOn: string;
  projectStatus: string;
}

export interface ProjectImage {
  id: string;
  src: unknown;
  alt: string;
}

export interface Project {
  slug: string;
  href: string;
  title: string;
  summary: string;
  category: string;
  hero: unknown;
  facts: ProjectFacts;
  scope: JsonObject[];
  gallery: ProjectImage[];
  serviceRefs: string[];
  featured: boolean;
  status: "draft" | "published";
  seo: { title: string; description: string };
}

export interface ProjectCategory {
  id: string;
  slug: string;
  label: string;
}

export interface ProjectIndex {
  categories: ProjectCategory[];
  featuredSlug: string;
  projectsPerPage: number;
}

export interface ProjectFilter {
  category?: string;
  service?: string;
}

/**
 * What a project card (listing grid, featured band, related band, service
 * page band) renders. Contract values are redacted unless public display is
 * explicitly enabled. SEO metadata never crosses to cards.
 */
export interface ProjectCardView {
  slug: string;
  href: string;
  title: string;
  summary: string;
  category: string;
  hero: unknown;
  status: "draft" | "published";
  featured: boolean;
  serviceRefs: string[];
  facts: Pick<ProjectFacts, "location" | "area" | "completedOn" | "client" | "consultant" | "duration" | "projectStatus"> & { value: string };
  gallery: ProjectImage[];
  scope: JsonObject[];
}

const PLACEHOLDER_HERO = "/placeholder.svg";

/** An empty hero and the new-project default placeholder both mean "no image". */
export function hasHeroImage(src: string): boolean {
  return !!src && src !== PLACEHOLDER_HERO;
}

const DEFAULT_PROJECTS_PER_PAGE = 9;

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const asObjects = (value: unknown): JsonObject[] =>
  (Array.isArray(value) ? value : [])
    .map(asObject)
    .filter((entry): entry is JsonObject => !!entry);

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const visible = (entry: JsonObject): boolean => entry.visible !== false;

export const projectHref = (slug: string): string => `/projects/${slug}`;

export function buildProject(
  documentName: string,
  document: JsonObject,
): Project | null {
  const slug = projectSlugFromDocument(documentName);
  if (!slug) return null;

  const facts = asObject(document.facts) ?? {};
  const seo = asObject(document.seo) ?? {};
  const title = text(document.title);
  const summary = text(document.summary);

  return {
    slug,
    href: projectHref(slug),
    title,
    summary,
    category: text(document.category),
    hero: document.hero,
    facts: {
      client: text(facts.client),
      consultant: text(facts.consultant),
      value: text(facts.value),
      valueVisible: facts.valueVisible === true,
      location: text(facts.location),
      area: text(facts.area),
      duration: text(facts.duration),
      completedOn: text(facts.completedOn),
      projectStatus: text(facts.projectStatus),
    },
    scope: asObjects(document.scope).filter((block) =>
      (BLOCK_TYPES as readonly string[]).includes(text(block.type)),
    ),
    gallery: asObjects(document.gallery)
      .filter(visible)
      .map((image, index) => ({
        id: text(image.id) || `image-${index}`,
        src: image.src,
        alt: text(image.alt),
      })),
    serviceRefs: asObjects(document.serviceRefs)
      .filter(visible)
      .map((ref) => text(ref.slug))
      .filter(Boolean),
    featured: document.featured === true,
    status: document.status === "published" ? "published" : "draft",
    seo: {
      title: text(seo.title) || title,
      description: text(seo.description) || summary,
    },
  };
}

/**
 * The contract value is a tender credential: redact it for every visitor
 * render, server-side, before the project crosses into a client component.
 * An editor gets the untouched project so the value stays editable and the
 * "hidden from visitors" toggle still shows its real state.
 */
export function publicProject(project: Project): Project {
  if (project.facts.valueVisible) return project;
  return { ...project, facts: { ...project.facts, value: "" } };
}

/**
 * Same redaction, applied to the raw stored document rather than the built
 * model — needed wherever the document itself (not just the derived
 * `Project`) is handed to a client component, since the CMS store rebuilds
 * the live project straight from the document on every edit.
 */
export function publicProjectDocument(document: JsonObject): JsonObject {
  const facts = asObject(document.facts);
  if (!facts || facts.valueVisible === true) return document;
  return { ...document, facts: { ...facts, value: "" } };
}

/** Projects a full `Project` down to what a card renders. */
export function toProjectCardView(project: Project): ProjectCardView {
  return {
    slug: project.slug,
    href: project.href,
    title: project.title,
    summary: project.summary,
    category: project.category,
    hero: project.hero,
    status: project.status,
    featured: project.featured,
    serviceRefs: project.serviceRefs,
    facts: {
      location: project.facts.location,
      area: project.facts.area,
      completedOn: project.facts.completedOn,
      client: project.facts.client,
      consultant: project.facts.consultant,
      duration: project.facts.duration,
      projectStatus: project.facts.projectStatus,
      // Never send a confidential contract value to public cards.
      value: project.facts.valueVisible ? project.facts.value : "",
    },
    gallery: project.gallery,
    scope: project.scope,
  };
}

export function buildProjectIndex(document: JsonObject): ProjectIndex {
  const featured = asObject(document.featured) ?? {};
  return {
    categories: asObjects(document.categories)
      .filter((category) => visible(category) && !!text(category.slug))
      .map((category, index) => ({
        id: text(category.id) || `category-${index}`,
        slug: text(category.slug),
        label: text(category.label) || text(category.slug),
      })),
    featuredSlug: text(featured.slug),
    projectsPerPage:
      typeof document.projectsPerPage === "number" && document.projectsPerPage > 0
        ? document.projectsPerPage
        : DEFAULT_PROJECTS_PER_PAGE,
  };
}

/**
 * These functions accept either a full `Project` or the redacted
 * `ProjectCardView` a route sends to the client — filtering and related
 * ranking only ever look at these fields, never at the sensitive ones a
 * card doesn't carry.
 */
type Filterable = Pick<Project, "status" | "category" | "serviceRefs">;
type Relatable = Pick<Project, "status" | "category" | "serviceRefs" | "slug" | "title">;

const published = <T extends Pick<Project, "status">>(projects: T[]): T[] =>
  projects.filter((project) => project.status === "published");

/** Published projects matching every filter that is set. */
export function filterProjects<T extends Filterable>(
  projects: T[],
  filter: ProjectFilter,
): T[] {
  return published(projects).filter(
    (project) =>
      (!filter.category || project.category === filter.category) &&
      (!filter.service || project.serviceRefs.includes(filter.service)),
  );
}

/** Published projects that reference a service — the service page's band. */
export function projectsForService<T extends Filterable>(
  projects: T[],
  serviceSlug: string,
): T[] {
  return filterProjects(projects, { service: serviceSlug });
}

/**
 * Other published projects, most related first: a shared category counts
 * double, each shared service once. Unrelated projects fill any remaining
 * slots so the band is never half-empty.
 */
export function relatedProjects<T extends Relatable, U extends Relatable>(
  project: T,
  projects: U[],
  limit = 3,
): U[] {
  const score = (other: U): number =>
    (other.category && other.category === project.category ? 2 : 0) +
    other.serviceRefs.filter((ref) => project.serviceRefs.includes(ref)).length;

  return published(projects)
    .filter((other) => other.slug !== project.slug)
    .map((other) => ({ other, points: score(other) }))
    .sort((a, b) => b.points - a.points || a.other.title.localeCompare(b.other.title))
    .slice(0, limit)
    .map(({ other }) => other);
}
