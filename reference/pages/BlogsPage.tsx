"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { AddPostControl } from "@/components/blog/AddPostControl";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { BlogPagination } from "@/components/blog/BlogPagination";
import {
  filterPosts,
  sortByNewest,
  visiblePosts,
} from "@/components/blog/blogFilters";
import { buildBlogIndex, buildPost, type BlogPost } from "@/components/blog/blogModel";
import { blogDocumentName } from "@/components/blog/blogSlug";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { useCmsEditing, useSection } from "@/components/cms/store";
import { CmsService } from "@/lib/services/cms.service";
import { clampPage, pageCount, pageItems } from "@/components/services/carouselPaging";
import { assetSrc } from "@/content/types";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

export default function BlogsPage({
  content,
  posts,
}: {
  content: JsonObject;
  posts: BlogPost[];
}) {
  const { showDrafts } = useCmsEditing();
  const router = useRouter();
  const searchParams = useSearchParams();

  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const search = useSection(["search"], asObject(content.search));
  const document = useSection([], content);
  const index = useMemo(() => buildBlogIndex(asObject(document)), [document]);

  const category = searchParams?.get("category") ?? "";
  const query = searchParams?.get("q") ?? "";
  const [page, setPage] = useState(0);

  // Published posts arrive with the page. Unpublished ones are fetched
  // through the authenticated CMS API, so drafts never reach a visitor.
  const [draftPosts, setDraftPosts] = useState<BlogPost[]>([]);
  useEffect(() => {
    if (!showDrafts) return;
    let cancelled = false;
    const known = new Set(posts.map((post) => post.slug));
    const missing = index.roster.filter((slug) => !known.has(slug));

    void Promise.all(
      missing.map(async (slug) => {
        const entry = await CmsService.getEntry(blogDocumentName(slug)).catch(
          () => null,
        );
        const source = entry?.draft ?? entry?.published;
        return source ? buildPost(blogDocumentName(slug), source) : null;
      }),
    ).then((loaded) => {
      if (!cancelled) {
        setDraftPosts(loaded.filter((post): post is BlogPost => !!post));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showDrafts, index.roster, posts]);

  const allPosts = useMemo(
    () => (showDrafts ? [...posts, ...draftPosts] : posts),
    [showDrafts, posts, draftPosts],
  );

  const results = useMemo(
    () => sortByNewest(filterPosts(visiblePosts(allPosts, showDrafts), { category, query })),
    [allPosts, showDrafts, category, query],
  );

  const perPage = index.postsPerPage;
  const pages = pageCount(results.length, perPage);
  const current = clampPage(page, results.length, perPage);
  const visible = pageItems(results, current, perPage);

  const update = (patch: { category?: string; query?: string }) => {
    const next = new URLSearchParams();
    const value = { category, query, ...patch };
    if (value.category) next.set("category", value.category);
    if (value.query) next.set("q", value.query);
    setPage(0);
    router.replace(next.toString() ? `/blogs?${next}` : "/blogs", { scroll: false });
  };

  const activeCategory = index.categories.find((entry) => entry.slug === category);
  // The raw list, so editors see and edit hidden categories too.
  const rawCategories = (Array.isArray(asObject(document).categories)
    ? (asObject(document).categories as unknown[])
    : []
  ).map(asObject);
  const categoryLabels = new Map(index.categories.map((entry) => [entry.slug, entry.label]));
  const categoryUsage = new Map<string, number>();
  for (const post of allPosts) {
    categoryUsage.set(post.category, (categoryUsage.get(post.category) ?? 0) + 1);
  }
  const roster = Array.isArray(asObject(document).posts)
    ? (asObject(document).posts as JsonObject[])
    : [];

  return (
    <AnimatedPage id="blogs" label="Blog" animations={animations} className="flex flex-col">
      <AnimatedSection id="blogsHero" label="Blog hero" className="bg-muted">
        <div className="container mx-auto grid gap-8 px-4 py-14 md:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <AnimatedElement
              id="blogs-eyebrow"
              type="text"
              label="Blog eyebrow"
              as="p"
              className="text-xs font-bold uppercase tracking-[0.2em] text-brand"
            >
              <E path={["hero", "eyebrow"]} value={String(hero.eyebrow ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="blogs-title"
              type="heading"
              label="Blog title"
              as="h1"
              className="mt-3 text-4xl font-bold text-foreground md:text-5xl"
            >
              {query ? (
                "Search Results"
              ) : activeCategory ? (
                `Blog Category: ${activeCategory.label}`
              ) : (
                <E path={["hero", "title"]} value={String(hero.title ?? "")} as="span" />
              )}
            </AnimatedElement>
            <AnimatedElement
              id="blogs-subtitle"
              type="text"
              label="Blog subtitle"
              as="p"
              className="mt-4 max-w-xl text-lg text-muted-foreground"
            >
              {query ? (
                `We found ${results.length} article${results.length === 1 ? "" : "s"} for "${query}"`
              ) : (
                <E
                  path={["hero", "subtitle"]}
                  value={String(hero.subtitle ?? "")}
                  as="span"
                />
              )}
            </AnimatedElement>
          </div>
          <AnimatedElement
            id="blogs-hero-image"
            type="image"
            label="Blog hero image"
            className="h-56 w-full overflow-hidden rounded-xl shadow-lg lg:h-72"
          >
            <EImg
              path={["hero", "image"]}
              image={{ src: assetSrc(hero.image), alt: String(hero.title ?? "") }}
              storedAs="string"
              className="h-full w-full object-cover"
            />
          </AnimatedElement>
        </div>
      </AnimatedSection>

      <AnimatedSection id="blogsList" label="Blog list" className="bg-background py-12">
        <div className="container mx-auto px-4 md:px-6">
          <BlogFilters
            categories={rawCategories}
            usage={categoryUsage}
            activeCategory={category}
            query={query}
            allLabel={String(search.allLabel ?? "All")}
            placeholder={String(search.placeholder ?? "Search articles…")}
            onChange={update}
          />

          {visible.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((post) => (
                <BlogCard
                  key={post.slug}
                  post={post}
                  categoryLabel={categoryLabels.get(post.category)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-center text-muted-foreground">
              No articles match your search.{" "}
              <button
                type="button"
                onClick={() => update({ category: "", query: "" })}
                className="font-semibold text-brand hover:underline"
              >
                Clear filters
              </button>
            </p>
          )}

          <BlogPagination page={current} pages={pages} onChange={setPage} />

          <div className="mt-8 flex justify-center">
            <AddPostControl
              roster={roster}
              indexPath={["posts"]}
              defaultCategory={index.categories[0]?.slug ?? ""}
            />
          </div>
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
