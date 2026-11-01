"use client";

import Link from "next/link";
import type { JsonObject } from "@/components/cms/json";
import { assetSrc } from "@/content/types";
import { formatPostDate } from "./BlogCard";
import type { BlogCategory, BlogPost } from "./blogModel";

export function BlogSidebar({
  related,
  counts,
  cta,
}: {
  related: BlogPost[];
  counts: (BlogCategory & { count: number })[];
  cta: JsonObject;
}) {
  return (
    <aside className="space-y-8">
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">Related Articles</h2>
          <ul className="space-y-3">
            {related.map((post) => (
              <li key={post.slug}>
                <Link href={post.href} className="group flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetSrc(post.image) || "/placeholder.svg"}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded object-cover"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground group-hover:text-brand-strong">
                      {post.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatPostDate(post.publishedAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">Categories</h2>
        <ul className="space-y-1">
          {counts.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/blogs?category=${encodeURIComponent(entry.slug)}`}
                className="flex items-center justify-between rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-brand-strong"
              >
                <span>{entry.label}</span>
                <span className="text-xs text-muted-foreground">{entry.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-brand-soft p-5">
        <p className="text-base font-bold text-foreground">{String(cta.title ?? "")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{String(cta.body ?? "")}</p>
        <Link
          href={String(cta.buttonHref ?? "/contact")}
          className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong"
        >
          {String(cta.buttonLabel ?? "Contact Us")}
        </Link>
      </section>
    </aside>
  );
}
