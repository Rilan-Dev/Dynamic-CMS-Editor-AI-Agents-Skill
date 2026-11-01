import type { JsonObject } from "@/components/cms/json";
import { blogSlugFromDocument } from "./blogSlug";
import { readingMinutes } from "./readingTime";

export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "bulletList",
  "checklist",
  "quote",
  "image",
  "callout",
] as const;

export type BlogBlockType = (typeof BLOCK_TYPES)[number];

export interface BlogBlock extends JsonObject {
  id: string;
  type: BlogBlockType;
}

export interface BlogPost {
  slug: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  image: unknown;
  author: string;
  publishedAt: string;
  readingMinutes: number;
  status: "draft" | "published";
  body: BlogBlock[];
  seo: { title: string; description: string };
}

export interface BlogCategory {
  id: string;
  slug: string;
  label: string;
}

export interface BlogIndex {
  categories: BlogCategory[];
  roster: string[];
  postsPerPage: number;
}

const DEFAULT_POSTS_PER_PAGE = 6;

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const isBlockType = (value: unknown): value is BlogBlockType =>
  typeof value === "string" && (BLOCK_TYPES as readonly string[]).includes(value);

export const postHref = (slug: string): string => `/blogs/${slug}`;

/** A post document plus its document name, or null when it is not a post. */
export function buildPost(
  documentName: string,
  document: JsonObject,
): BlogPost | null {
  const slug = blogSlugFromDocument(documentName);
  if (!slug) return null;

  const body = (Array.isArray(document.body) ? document.body : [])
    .map(asObject)
    .filter((block): block is JsonObject => !!block && isBlockType(block.type))
    .map((block, index) => ({
      ...block,
      id: text(block.id) || `block-${index}`,
      type: block.type as BlogBlockType,
    })) as BlogBlock[];

  const seo = asObject(document.seo) ?? {};

  return {
    slug,
    href: postHref(slug),
    title: text(document.title),
    excerpt: text(document.excerpt),
    category: text(document.category),
    image: document.image,
    author: text(document.author),
    publishedAt: text(document.publishedAt),
    readingMinutes:
      typeof document.readingMinutes === "number" && document.readingMinutes > 0
        ? document.readingMinutes
        : readingMinutes(body),
    status: document.status === "published" ? "published" : "draft",
    body,
    seo: {
      title: text(seo.title) || text(document.title),
      description: text(seo.description) || text(document.excerpt),
    },
  };
}

export function buildBlogIndex(document: JsonObject): BlogIndex {
  const categories = (Array.isArray(document.categories) ? document.categories : [])
    .map(asObject)
    // Hidden categories drop out of every visitor-facing list; editors
    // still see them on /blogs through the raw document.
    .filter(
      (category): category is JsonObject =>
        !!category && category.visible !== false && !!text(category.slug),
    )
    .map((category, index) => ({
      id: text(category.id) || `category-${index}`,
      slug: text(category.slug),
      label: text(category.label) || text(category.slug),
    }));

  const roster = (Array.isArray(document.posts) ? document.posts : [])
    .map(asObject)
    .map((entry) => (entry ? text(entry.slug) : ""))
    .filter(Boolean);

  return {
    categories,
    roster,
    postsPerPage:
      typeof document.postsPerPage === "number" && document.postsPerPage > 0
        ? document.postsPerPage
        : DEFAULT_POSTS_PER_PAGE,
  };
}
