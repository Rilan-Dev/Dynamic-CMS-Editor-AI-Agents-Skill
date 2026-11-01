"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import type { DocScope } from "@/components/cms/store";
import { assetSrc } from "@/content/types";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Full-bleed closing band. `inverse` is dark in both themes, so the scrim
 * over the photo stays dark and the light copy stays legible whichever
 * theme the visitor uses. The overlays ignore the pointer so the image
 * remains editable underneath them.
 *
 * `scope` names the document the section lives in: the page itself on
 * /projects, `doc:projects` on a project detail page, which shows the
 * index's CTA.
 */
export function ProjectCta({
  section,
  basePath,
  scope = "page",
}: {
  section: JsonObject;
  basePath: PathSegment[];
  scope?: DocScope;
}) {
  const image = assetSrc(section.image);

  return (
    <AnimatedSection
      id="projectsCta"
      label="Projects call to action"
      className="relative isolate overflow-hidden bg-inverse"
    >
      <div className="absolute inset-0 -z-10">
        <EImg
          scope={scope}
          path={[...basePath, "image"]}
          image={{ src: image, alt: "" }}
          storedAs="string"
          className="h-full w-full object-cover"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-inverse via-inverse/90 to-inverse/60"
      />

      <div className="pointer-events-none container mx-auto flex flex-col gap-8 px-4 py-14 md:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
        <div className="pointer-events-auto max-w-2xl">
          <AnimatedElement
            id="cta-eyebrow"
            type="text"
            label="CTA eyebrow"
            as="p"
            className="text-xs font-bold uppercase tracking-[0.2em] text-inverse-foreground/70"
          >
            <E
              scope={scope}
              path={[...basePath, "eyebrow"]}
              value={text(section.eyebrow)}
              as="span"
            />
          </AnimatedElement>
          <AnimatedElement
            id="cta-title"
            type="heading"
            label="CTA title"
            as="h2"
            className="mt-3 text-3xl font-bold leading-tight tracking-tight text-inverse-foreground md:text-4xl"
          >
            <E
              scope={scope}
              path={[...basePath, "title"]}
              value={text(section.title)}
              as="span"
            />
          </AnimatedElement>
          <AnimatedElement
            id="cta-body"
            type="text"
            label="CTA body"
            as="p"
            className="mt-3 text-base leading-relaxed text-inverse-foreground/70"
          >
            <E
              scope={scope}
              path={[...basePath, "body"]}
              value={text(section.body)}
              as="span"
              multilineBreaks
            />
          </AnimatedElement>
        </div>

        <AnimatedElement
          id="cta-button"
          type="button"
          label="CTA button"
          className="pointer-events-auto shrink-0"
        >
          <Link
            href={text(section.buttonHref) || "/contact"}
            className="group inline-flex items-center gap-2 rounded-full border border-inverse-foreground/40 px-7 py-3 text-sm font-semibold text-inverse-foreground transition-colors hover:bg-inverse-foreground hover:text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
          >
            <E
              scope={scope}
              path={[...basePath, "buttonLabel"]}
              value={text(section.buttonLabel) || "Contact Us"}
              as="span"
            />
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </AnimatedElement>
      </div>
    </AnimatedSection>
  );
}
