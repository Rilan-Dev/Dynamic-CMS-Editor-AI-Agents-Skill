"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import { assetSrc } from "@/content/types";
import type { BlogBlock } from "../blogModel";

const items = (block: JsonObject): string[] =>
  Array.isArray(block.items)
    ? block.items.map((item) => (typeof item === "string" ? item : ""))
    : [];

export function BlogBlockView({
  block,
  basePath,
  index,
}: {
  block: BlogBlock;
  basePath: PathSegment[];
  index: number;
}) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="mt-10 text-2xl font-bold text-foreground">
          <E path={[...basePath, index, "text"]} value={String(block.text ?? "")} as="span" />
        </h2>
      );

    case "paragraph":
      return (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          <E
            path={[...basePath, index, "text"]}
            value={String(block.text ?? "")}
            as="span"
            multilineBreaks
          />
        </p>
      );

    case "bulletList":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
          {items(block).map((item, itemIndex) => (
            <li key={itemIndex}>
              <E path={[...basePath, index, "items", itemIndex]} value={item} as="span" />
            </li>
          ))}
        </ul>
      );

    case "checklist":
      return (
        <ul className="mt-4 space-y-2">
          {items(block).map((item, itemIndex) => (
            <li key={itemIndex} className="flex items-start gap-2 text-muted-foreground">
              <Check size={18} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
              <E path={[...basePath, index, "items", itemIndex]} value={item} as="span" />
            </li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <figure className="mt-6 rounded-lg bg-brand-soft p-5">
          <blockquote className="text-base font-medium italic text-brand-strong">
            <E path={[...basePath, index, "text"]} value={String(block.text ?? "")} as="span" />
          </blockquote>
          <figcaption className="mt-2 text-sm text-brand-strong">
            <E
              path={[...basePath, index, "attribution"]}
              value={String(block.attribution ?? "")}
              as="span"
            />
          </figcaption>
        </figure>
      );

    case "image":
      return (
        <figure className="mt-6">
          <div className="h-72 w-full overflow-hidden rounded-lg">
            <EImg
              path={[...basePath, index, "src"]}
              image={{ src: assetSrc(block.src), alt: String(block.alt ?? "") }}
              storedAs="string"
              className="h-full w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 text-sm text-muted-foreground">
            <E
              path={[...basePath, index, "caption"]}
              value={String(block.caption ?? "")}
              as="span"
            />
          </figcaption>
        </figure>
      );

    case "callout":
      return (
        <aside className="mt-8 rounded-xl bg-brand-soft p-6">
          <p className="text-lg font-bold text-foreground">
            <E path={[...basePath, index, "title"]} value={String(block.title ?? "")} as="span" />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <E
              path={[...basePath, index, "body"]}
              value={String(block.body ?? "")}
              as="span"
              multilineBreaks
            />
          </p>
          <Link
            href={String(block.buttonHref ?? "/contact")}
            className="mt-4 inline-flex items-center rounded-md bg-brand px-5 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong"
          >
            <E
              path={[...basePath, index, "buttonLabel"]}
              value={String(block.buttonLabel ?? "")}
              as="span"
            />
          </Link>
        </aside>
      );

    default:
      return null;
  }
}
