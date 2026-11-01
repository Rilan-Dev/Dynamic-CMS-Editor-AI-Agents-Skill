"use client";

import Link from "next/link";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { BlogBody } from "@/components/blog/BlogBody";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { PostStatusControl } from "@/components/blog/PostStatusControl";
import {
  adjacentPosts,
  categoryCounts,
  relatedPosts,
  sortByNewest,
  visiblePosts,
} from "@/components/blog/blogFilters";
import {
  buildBlogIndex,
  type BlogBlock,
  type BlogCategory,
  type BlogPost,
} from "@/components/blog/blogModel";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import {
  setPath,
  useCmsEditing,
  useDocumentBySlug,
  useSection,
} from "@/components/cms/store";
import { assetSrc } from "@/content/types";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

export default function BlogPostPage({
  content,
  post: serverPost,
  posts,
  categories: serverCategories,
}: {
  content: JsonObject;
  post: BlogPost;
  posts: BlogPost[];
  categories: BlogCategory[];
}) {
  // The page document IS the post, so an empty base path reads its draft.
  const draft = useSection([], serverPost as unknown as JsonObject);
  const live = asObject(draft);
  const title = String(live.title ?? serverPost.title);
  const excerpt = String(live.excerpt ?? serverPost.excerpt);
  const category = String(live.category ?? serverPost.category);
  const author = String(live.author ?? serverPost.author);
  const publishedAt = String(live.publishedAt ?? serverPost.publishedAt);
  const status = live.status ?? serverPost.status;
  const image = live.image ?? serverPost.image;
  const body = (Array.isArray(live.body) ? live.body : serverPost.body) as BlogBlock[];

  // Categories come from the blogs document (loaded alongside the post
  // while editing), so a category added on /blogs is choosable here at once.
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const indexDoc = useDocumentBySlug<JsonObject | null>("blogs", null);
  const categories = indexDoc ? buildBlogIndex(asObject(indexDoc)).categories : serverCategories;
  const categoryLabel = categories.find((entry) => entry.slug === category)?.label ?? category;

  const ordered = sortByNewest(visiblePosts(posts, false));
  const { previous, next } = adjacentPosts(ordered, serverPost);

  return (
    <AnimatedPage id="blogPost" label="Article" animations={{}} className="flex flex-col">
      <AnimatedSection id="postHero" label="Article hero" className="bg-inverse">
        <div className="relative h-72 w-full overflow-hidden">
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/75 to-black/45" />
          <AnimatedElement
            id="post-image"
            type="image"
            label="Article image"
            className="absolute inset-0"
          >
            <EImg
              path={["image"]}
              image={{ src: assetSrc(image), alt: title }}
              storedAs="string"
              className="h-full w-full object-cover"
            />
          </AnimatedElement>
          <div className="container relative z-20 mx-auto flex h-full flex-col justify-end px-4 pb-8 md:px-6">
            {editActive ? (
              <label className="inline-flex" data-cms-ui>
                <span className="sr-only">Category</span>
                <select
                  data-cms-ui
                  value={category}
                  onChange={(event) => setPath(["category"], event.target.value)}
                  className="rounded-full border-0 bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-contrast"
                >
                  {!categories.some((entry) => entry.slug === category) && (
                    <option value={category}>{category || "Choose a category"}</option>
                  )}
                  {categories.map((entry) => (
                    <option key={entry.id} value={entry.slug}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              category && (
                <Link
                  href={`/blogs?category=${encodeURIComponent(category)}`}
                  className="text-xs font-bold uppercase tracking-[0.2em] text-inverse-foreground/70 transition-colors hover:text-inverse-foreground"
                >
                  {categoryLabel}
                </Link>
              )
            )}
            <h1 className="mt-2 max-w-3xl text-3xl font-bold text-inverse-foreground md:text-4xl">
              <E path={["title"]} value={title} as="span" />
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-inverse-foreground/70">
              <E path={["publishedAt"]} value={publishedAt} as="span" />
              <span aria-hidden="true">·</span>
              <span>{serverPost.readingMinutes} min read</span>
              <span aria-hidden="true">·</span>
              <span>
                By <E path={["author"]} value={author} as="span" />
              </span>
              <PostStatusControl status={String(status)} />
            </p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="postBody" label="Article body" className="bg-background py-12">
        <div className="container mx-auto grid gap-10 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article>
            <p className="text-lg text-muted-foreground">
              <E path={["excerpt"]} value={excerpt} as="span" multilineBreaks />
            </p>
            <BlogBody blocks={body} basePath={["body"]} />

            <nav className="mt-12 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-sm">
              {previous ? (
                <Link href={previous.href} className="text-brand hover:underline">
                  ← Previous Post
                  <span className="block text-muted-foreground">{previous.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={next.href} className="text-right text-brand hover:underline">
                  Next Post →<span className="block text-muted-foreground">{next.title}</span>
                </Link>
              )}
            </nav>
          </article>

          <BlogSidebar
            related={relatedPosts(posts, serverPost, 3)}
            counts={categoryCounts(visiblePosts(posts, false), categories)}
            cta={asObject(content.cta)}
          />
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
