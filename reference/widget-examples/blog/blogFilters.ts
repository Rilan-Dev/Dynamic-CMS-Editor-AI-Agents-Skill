import type { BlogCategory, BlogPost } from "./blogModel";

/** Drafts are visible only while an editor is working. */
export const visiblePosts = (posts: BlogPost[], editing: boolean): BlogPost[] =>
  editing ? posts : posts.filter((post) => post.status === "published");

export const sortByNewest = (posts: BlogPost[]): BlogPost[] =>
  [...posts].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

export function filterPosts(
  posts: BlogPost[],
  { category, query }: { category: string; query: string },
): BlogPost[] {
  const needle = query.trim().toLowerCase();
  return posts.filter((post) => {
    if (category && post.category !== category) return false;
    if (!needle) return true;
    return [post.title, post.excerpt, post.category]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

export const categoryCounts = (
  posts: BlogPost[],
  categories: BlogCategory[],
): (BlogCategory & { count: number })[] =>
  categories.map((category) => ({
    ...category,
    count: posts.filter((post) => post.category === category.slug).length,
  }));

/**
 * Same category first, newest first, then recent posts from other
 * categories so a thin category still fills the sidebar.
 */
export function relatedPosts(
  posts: BlogPost[],
  current: BlogPost,
  limit: number,
): BlogPost[] {
  const pool = sortByNewest(
    posts.filter((post) => post.status === "published" && post.slug !== current.slug),
  );
  const sameCategory = pool.filter((post) => post.category === current.category);
  const rest = pool.filter((post) => post.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

export function adjacentPosts(
  ordered: BlogPost[],
  current: BlogPost,
): { previous: BlogPost | null; next: BlogPost | null } {
  const index = ordered.findIndex((post) => post.slug === current.slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
  };
}
