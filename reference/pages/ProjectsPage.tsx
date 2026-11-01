"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing, useSection } from "@/components/cms/store";
import { AddProjectControl } from "@/components/projects/AddProjectControl";
import { FeaturedProject, resolveFeaturedProject } from "@/components/projects/FeaturedProject";
import { ProjectCard, humanizeSlug } from "@/components/projects/ProjectCard";
import { ProjectCta } from "@/components/projects/ProjectCta";
import { ProjectFilters, projectsHref } from "@/components/projects/ProjectFilters";
import { ProjectStats } from "@/components/projects/ProjectStats";
import {
  buildProject,
  buildProjectIndex,
  filterProjects,
  type Project,
  type ProjectCardView,
  type ProjectFilter,
} from "@/components/projects/projectModel";
import { projectDocumentName } from "@/components/projects/projectSlug";
import { assetSrc } from "@/content/types";
import { CmsService } from "@/lib/services/cms.service";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asObjects = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.map(asObject) : [];

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** Editors also see drafts, so they cannot go through `filterProjects`. */
const matchesFilter = (project: ProjectCardView, filter: ProjectFilter): boolean =>
  (!filter.category || project.category === filter.category) &&
  (!filter.service || project.serviceRefs.includes(filter.service));

export default function ProjectsPage({
  content,
  projects,
  serviceCatalogue = [],
}: {
  content: JsonObject;
  /** Redacted card views — never the contract value, client/consultant or scope. */
  projects: ProjectCardView[];
  /** Slug/title pairs from the services document, for the active-filter chip's label. */
  serviceCatalogue?: { slug: string; title: string }[];
}) {
  const { showDrafts, editing, ready } = useCmsEditing();
  const searchParams = useSearchParams();

  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const filters = useSection(["filters"], asObject(content.filters));
  const featured = useSection(["featured"], asObject(content.featured));
  const recent = useSection(["recent"], asObject(content.recent));
  const related = useSection(["related"], asObject(content.related));
  const stats = useSection(["stats"], asObject(content.stats));
  const empty = useSection(["empty"], asObject(content.empty));
  const cta = useSection(["cta"], asObject(content.cta));
  const document = useSection([], content);
  const index = useMemo(() => buildProjectIndex(asObject(document)), [document]);
  const roster = asObjects(asObject(document).projects);
  const detailsEnabled = asObject(document).detailPagesEnabled === true;

  const category = searchParams?.get("category") ?? "";
  const service = searchParams?.get("service") ?? "";
  const filtered = !!(category || service);
  const serviceLabel = service
    ? serviceCatalogue.find((entry) => entry.slug === service)?.title ||
      humanizeSlug(service)
    : "";

  // Published projects arrive with the page. Unpublished ones are fetched
  // through the authenticated CMS API, so drafts never reach a visitor.
  const [draftProjects, setDraftProjects] = useState([] as ProjectCardView[]);
  useEffect(() => {
    if (!showDrafts) return;
    let cancelled = false;
    const known = new Set(projects.map((project) => project.slug));
    const missing = roster
      .map((entry) => text(entry.slug))
      .filter((slug) => slug && !known.has(slug));

    void Promise.all(
      missing.map(async (slug) => {
        const entry = await CmsService.getEntry(projectDocumentName(slug)).catch(
          () => null,
        );
        const source = entry?.draft ?? entry?.published;
        return source ? buildProject(projectDocumentName(slug), source) : null;
      }),
    ).then((loaded) => {
      if (!cancelled) {
        setDraftProjects(loaded.filter((project): project is Project => !!project));
      }
    });

    return () => {
      cancelled = true;
    };
    // `roster` is rebuilt every render; its slugs are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDrafts, projects, roster.map((entry) => text(entry.slug)).join("|")]);

  const published = useMemo(
    () => projects.filter((project) => project.status === "published"),
    [projects],
  );

  const featuredProject = filtered
    ? null
    : resolveFeaturedProject(published, index.featuredSlug);

  const results = useMemo(() => {
    const filter = { category, service };
    const matching = showDrafts
      ? [...projects, ...draftProjects].filter((project) => matchesFilter(project, filter))
      : filterProjects(projects, filter);
    // The featured band already shows this one; don't repeat it below.
    return featuredProject
      ? matching.filter((project) => project.slug !== featuredProject.slug)
      : matching;
  }, [showDrafts, projects, draftProjects, category, service, featuredProject]);

  // "Load more" rather than numbered pages: a portfolio is browsed, not
  // searched. The count resets whenever the filter changes.
  const perPage = index.projectsPerPage;
  const filterKey = `${category}|${service}`;
  const [paging, setPaging] = useState({ key: filterKey, count: perPage });
  const count = paging.key === filterKey ? paging.count : perPage;
  const visible = results.slice(0, count);

  const categoryLabels = new Map(
    index.categories.map((entry) => [entry.slug, entry.label]),
  );
  const nothingPublished =
    !published.length && !(showDrafts && (projects.length || draftProjects.length));
  const viewAllLabel =
    text(recent.viewAllLabel) || text(related.viewAllLabel) || "View All Projects";
  // When the only published project is the featured one, the unfiltered
  // grid has nothing left to show. A visitor gets nothing but the section's
  // own padding for that; an editor still needs the section so its labels
  // stay editable and AddProjectControl stays reachable.
  const skipEmptyListSection =
    !showDrafts && !nothingPublished && !filtered && results.length === 0;

  return (
    <AnimatedPage id="projects" label="Projects" animations={animations} className="flex flex-col">
      {/* ---------------- hero ---------------- */}
      <AnimatedSection
        id="projectsHero"
        label="Projects hero"
        className="relative isolate overflow-hidden bg-background"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-soft via-background to-background"
        />

        <div className="pointer-events-none container relative z-10 mx-auto px-4 pb-10 pt-14 md:px-6 lg:flex lg:min-h-[34rem] lg:items-center lg:py-20">
          <div className="pointer-events-auto max-w-xl lg:w-[46%]">
            <AnimatedElement
              id="projects-eyebrow"
              type="text"
              label="Projects eyebrow"
              as="p"
              className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong"
            >
              <E path={["hero", "eyebrow"]} value={text(hero.eyebrow)} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="projects-title"
              type="heading"
              label="Projects title"
              as="h1"
              className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-[3.5rem]"
            >
              <E path={["hero", "title"]} value={text(hero.title)} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="projects-subtitle"
              type="text"
              label="Projects subtitle"
              as="p"
              className="mt-5 text-lg leading-relaxed text-muted-foreground"
            >
              <E
                path={["hero", "subtitle"]}
                value={text(hero.subtitle)}
                as="span"
                multilineBreaks
              />
            </AnimatedElement>
            <div className="mt-8">
              <ProjectFilters
                categories={asObjects(asObject(document).categories)}
                activeCategory={category}
                activeService={service}
                activeServiceLabel={serviceLabel}
                allLabel={text(filters.allLabel) || "All"}
              />
            </div>
          </div>
        </div>

        {/* Stacked under the copy on mobile; the right half on desktop. */}
        <AnimatedElement
          id="projects-hero-image"
          type="image"
          label="Projects hero image"
          className="relative h-64 sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[56%]"
        >
          {/*
            A mask fades the image's own alpha rather than painting a flat
            "from-background" colour on top of it — an overlay colour can
            only approximate the backdrop at that point (the section behind
            it is a diagonal `from-brand-soft` tint, not a flat colour), so
            the two always meet at a visible seam. Fading the image itself
            reveals whatever is actually behind it, in either theme. Below
            `lg` the image is stacked under the copy, so it only needs a top
            fade there; at `lg` it sits beside the copy, so the fade runs
            left-to-right instead.
          */}
          <EImg
            path={["hero", "image"]}
            image={{ src: assetSrc(hero.image), alt: text(hero.title) }}
            storedAs="string"
            className="h-full w-full object-cover [mask-image:linear-gradient(to_bottom,transparent,black_25%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_25%)] lg:[mask-image:linear-gradient(to_right,transparent,black_40%)] lg:[-webkit-mask-image:linear-gradient(to_right,transparent,black_40%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
          />
        </AnimatedElement>
      </AnimatedSection>

      {/* ---------------- featured ---------------- */}
      {!filtered && (
        <FeaturedProject
          project={featuredProject}
          section={featured}
          candidates={published}
        />
      )}

      {/* ---------------- recent ---------------- */}
      {!skipEmptyListSection && (
      <AnimatedSection id="projectsList" label="Project list" className="bg-background py-14 lg:py-20">
        <div className="container mx-auto px-4 md:px-6">
          {nothingPublished ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Building2 size={26} aria-hidden="true" />
              </span>
              <E
                path={["empty", "title"]}
                value={text(empty.title)}
                as="h2"
                className="mt-5 text-2xl font-bold tracking-tight text-foreground"
              />
              <E
                path={["empty", "body"]}
                value={text(empty.body)}
                as="p"
                multilineBreaks
                className="mt-3 max-w-md text-muted-foreground"
              />
              <Link
                href={text(empty.buttonHref) || "/contact"}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-contrast transition-colors hover:bg-brand-strong"
              >
                <E
                  path={["empty", "buttonLabel"]}
                  value={text(empty.buttonLabel) || "Contact Us"}
                  as="span"
                />
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : !filtered && results.length === 0 ? null : (
            <>
              {editing && ready && (
                <label data-cms-ui className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-brand/40 bg-brand-soft/40 px-4 py-3 text-sm">
                  <input type="checkbox" checked={detailsEnabled} onChange={(event) => setPath(["detailPagesEnabled"], event.currentTarget.checked)} className="h-4 w-4 accent-current" />
                  <span>
                    <span className="block font-semibold text-foreground">Enable project detail pages</span>
                    <span className="block text-xs text-muted-foreground">Show a “View Details” button on project cards when enabled. When disabled, hide the button and edit the expanded cards here.</span>
                  </span>
                </label>
              )}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <AnimatedElement
                    id="recent-eyebrow"
                    type="text"
                    label="Recent projects eyebrow"
                    as="p"
                    className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong"
                  >
                    <E path={["recent", "eyebrow"]} value={text(recent.eyebrow)} as="span" />
                  </AnimatedElement>
                  <AnimatedElement
                    id="recent-title"
                    type="heading"
                    label="Recent projects title"
                    as="h2"
                    className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl"
                  >
                    <E path={["recent", "title"]} value={text(recent.title)} as="span" />
                  </AnimatedElement>
                </div>
                {filtered && (
                  <Link
                    href={projectsHref({})}
                    scroll={false}
                    className="group inline-flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-strong"
                  >
                    <E path={["recent", "viewAllLabel"]} value={viewAllLabel} as="span" />
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                )}
              </div>

              {results.length > 0 ? (
                <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                  {visible.map((project, position) => (
                    <AnimatedElement
                      key={project.slug}
                      id={`project-card-${position}`}
                      type="card"
                      label={project.title || "Project"}
                      staggerIndex={position % 3}
                    >
                      <ProjectCard
                        project={project}
                        detailsEnabled={detailsEnabled}
                        priority={position < 3}
                        categoryLabel={categoryLabels.get(project.category)}
                        detailsLabel={text(recent.cardLinkLabel) || "View Details"}
                        detailsLabelPath={["recent", "cardLinkLabel"]}
                      />
                    </AnimatedElement>
                  ))}
                </div>
              ) : filtered ? (
                // The header above already links "View All Projects" — a
                // second one here just duplicates it.
                <p className="mt-10 rounded-2xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
                  <E
                    path={["empty", "noMatch"]}
                    value={text(empty.noMatch) || "No projects match this filter yet."}
                    as="span"
                  />
                </p>
              ) : null}

              {results.length > count && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPaging({ key: filterKey, count: count + perPage })}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand-strong"
                  >
                    <E
                      path={["recent", "loadMoreLabel"]}
                      value={text(recent.loadMoreLabel) || "Load More Projects"}
                      as="span"
                    />
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-10 flex justify-center">
            <AddProjectControl
              roster={roster}
              indexPath={["projects"]}
              defaultCategory={index.categories[0]?.slug ?? ""}
            />
          </div>
        </div>
      </AnimatedSection>
      )}

      {/* ---------------- stats ---------------- */}
      <ProjectStats section={stats} basePath={["stats"]} />

      {/* ---------------- closing CTA ---------------- */}
      <ProjectCta section={cta} basePath={["cta"]} />
    </AnimatedPage>
  );
}
