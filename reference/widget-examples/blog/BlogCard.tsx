"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { assetSrc } from "@/content/types";
import type { BlogPost } from "./blogModel";

/** "25 Apr 2026" — fixed locale and UTC so server and client agree. */
export function formatPostDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function BlogCard({ post, categoryLabel }: { post: BlogPost; categoryLabel?: string }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-md transition-transform duration-300 hover:-translate-y-1">
      <Link href={post.href} className="block h-44 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetSrc(post.image) || "/placeholder.svg"}
          alt={post.title}
          className="h-full w-full object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.category && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-strong">
              {categoryLabel || post.category}
            </span>
          )}
          <span>{formatPostDate(post.publishedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} min read</span>
          {post.status === "draft" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
              Draft
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg font-bold text-foreground">
          <Link href={post.href} className="hover:text-brand-strong">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 min-h-[3.75rem] flex-1 text-sm text-muted-foreground">
          {post.excerpt}
        </p>
        <Link
          href={post.href}
          className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-brand hover:text-brand-strong"
        >
          Read More
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
