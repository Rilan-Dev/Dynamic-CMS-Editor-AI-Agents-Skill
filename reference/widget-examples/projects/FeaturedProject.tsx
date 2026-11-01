"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, MapPin, Ruler, type LucideIcon } from "lucide-react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { E } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { assetSrc } from "@/content/types";
import { hasHeroImage, type Project, type ProjectCardView } from "./projectModel";

/**
 * The project the band highlights: the one the editor named, else the first
 * published project flagged `featured`, else none — the band is omitted
 * rather than promoting an arbitrary project.
 */
export function resolveFeaturedProject<
  T extends Pick<Project, "status" | "slug" | "featured">,
>(projects: T[], featuredSlug: string): T | null {
  const published = projects.filter((project) => project.status === "published");
  return (
    (featuredSlug && published.find((project) => project.slug === featuredSlug)) ||
    published.find((project) => project.featured) ||
    null
  );
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

export function FeaturedProject({
  project,
  section,
  candidates,
}: {
  project: ProjectCardView | null;
  section: JsonObject;
  /** Published projects the editor may pin; used in edit mode only. */
  candidates: ProjectCardView[];
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;

  if (!project && !editActive) return null;

  const meta: { key: string; icon: LucideIcon; label: string; value: string }[] = project
    ? [
        {
          key: "locationLabel",
          icon: MapPin,
          label: text(section.locationLabel) || "Location",
          value: project.facts.location,
        },
        {
          key: "areaLabel",
          icon: Ruler,
          label: text(section.areaLabel) || "Area",
          value: project.facts.area,
        },
        {
          key: "completionLabel",
          icon: CalendarCheck,
          label: text(section.completionLabel) || "Completion",
          value: project.facts.completedOn,
        },
      ].filter((item) => item.value)
    : [];

  return (
    <AnimatedSection id="projectsFeatured" label="Featured project" className="bg-background pt-4 lg:pt-8">
      <div className="container mx-auto px-4 md:px-6">
        {editActive && (
          <FeaturedPicker
            featuredSlug={text(section.slug)}
            candidates={candidates}
          />
        )}

        {project ? (
          <AnimatedElement
            id="featured-card"
            type="card"
            label="Featured project card"
            as="article"
            className="relative grid overflow-hidden rounded-3xl border border-border bg-brand-soft shadow-sm lg:grid-cols-2"
          >
            <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:py-14 lg:pl-12 lg:pr-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
                <E path={["featured", "eyebrow"]} value={text(section.eyebrow)} as="span" />
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                {project.title}
              </h2>
              {project.summary && (
                <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                  {project.summary}
                </p>
              )}

              {meta.length > 0 && (
                <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
                  {meta.map(({ key, icon: Icon, label, value }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-brand shadow-sm">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          <E path={["featured", key]} value={label} as="span" />
                        </dt>
                        <dd className="text-sm font-semibold text-foreground">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-8">
                <Link
                  href={editActive ? `${project.href}?edit=1` : "/contact"}
                  className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-contrast shadow-sm transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-soft"
                >
                  <E
                    path={["featured", "buttonLabel"]}
                    value={text(section.buttonLabel) || (editActive ? "Edit Project Information" : "Enquire about a similar project")}
                    as="span"
                  />
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>

            <div className="relative min-h-64 sm:min-h-80 lg:min-h-full">
              {hasHeroImage(assetSrc(project.hero)) ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetSrc(project.hero)}
                    alt={project.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Melts the photo into the card: upward on mobile, leftward on desktop. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-soft via-transparent to-transparent lg:bg-gradient-to-r lg:via-brand-soft/30"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Building2 size={56} aria-hidden="true" className="text-muted-foreground" />
                </div>
              )}
            </div>
          </AnimatedElement>
        ) : (
          <p className="rounded-3xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            No featured project yet. Pick a published project above.
          </p>
        )}
      </div>
    </AnimatedSection>
  );
}

function FeaturedPicker({
  featuredSlug,
  candidates,
}: {
  featuredSlug: string;
  candidates: ProjectCardView[];
}) {
  return (
    <label data-cms-ui className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      Featured project
      <select
        value={featuredSlug}
        onChange={(event) => setPath(["featured", "slug"], event.currentTarget.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
      >
        <option value="">Automatic (first marked as featured)</option>
        {candidates.map((project) => (
          <option key={project.slug} value={project.slug}>
            {project.title || project.slug}
          </option>
        ))}
      </select>
    </label>
  );
}
