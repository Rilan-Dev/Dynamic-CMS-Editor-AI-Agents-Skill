"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ChevronRight,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { BlogBody } from "@/components/blog/BlogBody";
import type { BlogBlock } from "@/components/blog/blogModel";
import { E, EImg, ERemove } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing, useDocumentBySlug, useSection } from "@/components/cms/store";
import { ProjectCard, humanizeSlug } from "@/components/projects/ProjectCard";
import { ProjectCta } from "@/components/projects/ProjectCta";
import { resolveProjectServices, serviceChoices } from "@/components/projects/projectDetail";
import { ProjectFacts } from "@/components/projects/ProjectFacts";
import { ProjectGallery } from "@/components/projects/ProjectGallery";
import {
  buildProject,
  buildProjectIndex,
  hasHeroImage,
  relatedProjects,
  type Project,
  type ProjectCardView,
} from "@/components/projects/projectModel";
import { projectDocumentName } from "@/components/projects/projectSlug";
import { ProjectStatusControl } from "@/components/projects/ProjectStatusControl";
import { assetSrc } from "@/content/types";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asObjects = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.map(asObject) : [];

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Labels and the CTA belong to the projects index, which the store loads
 * next to every project page, so they are edited in place from here.
 */
const INDEX = "doc:projects" as const;

export default function ProjectDetailPage({
  document,
  project: serverProject,
  projects,
  indexDocument,
  servicesDocument,
}: {
  /** The stored project document — edit paths are relative to it. */
  document: JsonObject;
  project: Project;
  /** Published projects, for the related band — redacted card views. */
  projects: ProjectCardView[];
  indexDocument: JsonObject;
  /** The published service catalogue that references resolve against. */
  servicesDocument: JsonObject;
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;

  // The page document IS the project, so an empty base path reads its draft;
  // rebuilding through the model keeps every band in step with the edit.
  const live = asObject(useSection([], document));
  const project =
    buildProject(projectDocumentName(serverProject.slug), live) ?? serverProject;
  const indexDoc = asObject(useDocumentBySlug("projects", indexDocument));
  const index = buildProjectIndex(indexDoc);
  const labels = asObject(indexDoc.detail);
  const related = asObject(indexDoc.related);
  const cta = asObject(indexDoc.cta);

  const categoryLabels = new Map(index.categories.map((entry) => [entry.slug, entry.label]));
  const categoryLabel = (slug: string) => categoryLabels.get(slug) || humanizeSlug(slug);
  const heroSrc = assetSrc(project.hero);
  const heroImage = heroSrc || "/placeholder.svg";
  const showHeroImage = editActive || hasHeroImage(heroSrc);

  const scope: BlogBlock[] = project.scope.map((block, position) => ({
    ...block,
    id: text(block.id) || `block-${position}`,
    type: block.type as BlogBlock["type"],
  }));

  // Service references: visitors get resolved links only; an editor sees
  // every stored reference so a stale one can be removed.
  const storedRefs = asObjects(live.serviceRefs);
  const chips = resolveProjectServices(project.serviceRefs, servicesDocument);
  const choices = serviceChoices(
    servicesDocument,
    storedRefs.map((ref) => text(ref.slug)),
  );
  const updateRefs = (next: JsonObject[]) => setPath(["serviceRefs"], next);

  const meta: { icon: LucideIcon; value: string }[] = [
    { icon: BadgeCheck, value: project.facts.projectStatus },
    { icon: MapPin, value: project.facts.location },
    { icon: CalendarCheck, value: project.facts.completedOn },
  ].filter((entry) => entry.value.trim());

  const relatedList = relatedProjects(project, projects, 3);
  const viewAllLabel = text(related.viewAllLabel) || "View All Projects";

  // A render helper, not a component, so editable leaves are not remounted.
  const indexLabel = (path: string[], value: string) => (
    <E scope={INDEX} path={path} value={value} as="span" />
  );

  return (
    <AnimatedPage
      id="project"
      label="Project"
      animations={asObject(live.animations)}
      className="flex flex-col"
    >
      {/* ---------------- hero ---------------- */}
      <AnimatedSection
        id="projectHero"
        label="Project hero"
        className="relative isolate flex min-h-[30rem] items-end overflow-hidden bg-inverse md:min-h-[34rem] lg:min-h-[40rem]"
      >
        <AnimatedElement
          id="project-hero-image"
          type="image"
          label="Project hero image"
          className="absolute inset-0 -z-10"
        >
          {showHeroImage ? (
            <EImg
              path={["hero"]}
              image={{ src: heroImage, alt: project.title }}
              storedAs="string"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Building2 size={72} aria-hidden="true" className="text-muted-foreground" />
            </div>
          )}
        </AnimatedElement>
        {/* Fixed-dark scrim: the copy sits on a photograph in either theme. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/50 to-black/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-black/50 to-transparent"
        />
        {!showHeroImage && (
          // The themed fallback is much lighter than a photo, so the usual
          // scrim above isn't dark enough at the bottom for the title to
          // stay legible in light mode — this brings it to the same fixed-dark
          // level the section's own `bg-inverse` already uses.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-inverse/70"
          />
        )}

        <div className="pointer-events-none container mx-auto px-4 pb-12 pt-28 md:px-6 lg:pb-16">
          <div className="pointer-events-auto max-w-4xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-inverse-foreground/70">
                <li>
                  <Link
                    href="/projects"
                    className="transition-colors hover:text-inverse-foreground"
                  >
                    {indexLabel(["detail", "breadcrumbLabel"], text(labels.breadcrumbLabel) || "Projects")}
                  </Link>
                </li>
                {project.category && (
                  <li className="inline-flex items-center gap-1.5">
                    <ChevronRight size={14} aria-hidden="true" />
                    <Link
                        href={`/projects?category=${encodeURIComponent(project.category)}`}
                        className="transition-colors hover:text-inverse-foreground"
                      >
                      {categoryLabel(project.category)}
                    </Link>
                  </li>
                )}
              </ol>
            </nav>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {editActive ? (
                <label className="inline-flex items-center gap-2" data-cms-ui>
                  <span className="sr-only">Category</span>
                  <select
                    data-cms-ui
                    value={project.category}
                    onChange={(event) => setPath(["category"], event.target.value)}
                    className="rounded-full border-0 bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-contrast"
                  >
                    {!categoryLabels.has(project.category) && (
                      <option value={project.category}>
                        {project.category || "Choose a category"}
                      </option>
                    )}
                    {index.categories.map((entry) => (
                      <option key={entry.id} value={entry.slug}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                project.category && (
                  <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-contrast">
                    {categoryLabel(project.category)}
                  </span>
                )
              )}
              <ProjectStatusControl status={project.status} />
            </div>

            <AnimatedElement
              id="project-title"
              type="heading"
              label="Project title"
              as="h1"
              className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-inverse-foreground md:text-5xl lg:text-6xl"
            >
              <E path={["title"]} value={project.title} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="project-summary"
              type="text"
              label="Project summary"
              as="p"
              className="mt-5 max-w-2xl text-lg leading-relaxed text-inverse-foreground/70"
            >
              <E path={["summary"]} value={project.summary} as="span" multilineBreaks />
            </AnimatedElement>

            {meta.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2.5">
                {meta.map(({ icon: Icon, value }, position) => (
                  <li
                    key={position}
                    className="inline-flex items-center gap-2 rounded-full border border-inverse-foreground/15 bg-black/30 px-3.5 py-1.5 text-sm font-medium text-inverse-foreground backdrop-blur-sm"
                  >
                    <Icon size={15} aria-hidden="true" className="text-inverse-foreground/70" />
                    {value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* ---------------- facts + scope ---------------- */}
      <AnimatedSection
        id="projectOverview"
        label="Project overview"
        className="bg-background py-14 lg:py-20"
      >
        <div className="container mx-auto grid gap-10 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          {/* First in reading order — the summary card — but the right-hand column on desktop. */}
          <aside className="lg:col-start-2 lg:row-start-1">
            <div className="lg:sticky lg:top-28">
              <ProjectFacts
                facts={project.facts}
                labels={labels}
                enquireHref={text(cta.buttonHref) || "/contact"}
              />
            </div>
          </aside>

          <article className="min-w-0 max-w-3xl lg:col-start-1 lg:row-start-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
              {indexLabel(
                ["detail", "overviewEyebrow"],
                text(labels.overviewEyebrow) || "Project Overview",
              )}
            </p>
            <BlogBody blocks={scope} basePath={["scope"]} />
          </article>
        </div>
      </AnimatedSection>

      {/* ---------------- gallery ---------------- */}
      <ProjectGallery gallery={live.gallery} labels={labels} projectTitle={project.title} />

      {/* ---------------- services used ---------------- */}
      {(chips.length > 0 || editActive) && (
        <AnimatedSection
          id="projectServices"
          label="Services delivered"
          className="border-y border-border bg-background py-12 lg:py-14"
        >
          <div className="container mx-auto flex flex-col gap-6 px-4 md:px-6 lg:flex-row lg:items-center lg:gap-16">
            <div className="shrink-0 lg:w-72">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
                {indexLabel(["detail", "servicesEyebrow"], text(labels.servicesEyebrow) || "Expertise")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {indexLabel(
                  ["detail", "servicesTitle"],
                  text(labels.servicesTitle) || "Services Delivered",
                )}
              </h2>
            </div>

            <ul className="flex flex-wrap gap-3">
              {editActive
                ? storedRefs.map((ref, position) => {
                    const slug = text(ref.slug);
                    const chip = chips.find((entry) => entry.slug === slug);
                    return (
                      <li
                        key={text(ref.id) || `${slug}-${position}`}
                        className={`relative inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${
                          chip
                            ? "border-border bg-card text-foreground"
                            : "border-destructive/40 bg-destructive/10 text-destructive"
                        }`}
                      >
                        <ERemove
                          onRemove={() =>
                            updateRefs(storedRefs.filter((_, index) => index !== position))
                          }
                          label="service reference"
                        />
                        {chip ? chip.title : `${slug || "(empty)"} — unavailable`}
                      </li>
                    );
                  })
                : chips.map((chip) => (
                    <li key={chip.slug}>
                      <Link
                        href={chip.href}
                        className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {chip.title}
                        <ArrowUpRight
                          size={15}
                          aria-hidden="true"
                          className="text-brand transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  ))}

              {editActive && choices.length > 0 && (
                <li data-cms-ui>
                  <label className="sr-only" htmlFor="project-add-service">
                    Add a service
                  </label>
                  {/* Chosen from the published catalogue, never typed. */}
                  <select
                    id="project-add-service"
                    data-cms-ui
                    value=""
                    onChange={(event) => {
                      const slug = event.target.value;
                      if (!slug) return;
                      updateRefs([
                        ...storedRefs,
                        { id: createCmsItemId("service"), slug, visible: true },
                      ]);
                    }}
                    className="rounded-full border border-dashed border-brand bg-background px-4 py-2 text-sm font-semibold text-brand-strong"
                  >
                    <option value="">+ Add a service</option>
                    {choices.map((group) => (
                      <optgroup key={group.title} label={group.title}>
                        {group.options.map((option) => (
                          <option key={option.slug} value={option.slug}>
                            {option.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </li>
              )}
            </ul>
          </div>
        </AnimatedSection>
      )}

      {/* ---------------- related ---------------- */}
      {relatedList.length > 0 && (
        <AnimatedSection
          id="projectRelated"
          label="Related projects"
          className="bg-muted/40 py-14 lg:py-20"
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
                  {indexLabel(["detail", "relatedEyebrow"], text(labels.relatedEyebrow) || "More Work")}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {indexLabel(["related", "title"], text(related.title) || "Related Projects")}
                </h2>
              </div>
              <Link
                href="/projects"
                className="group inline-flex items-center gap-2 text-sm font-bold text-brand transition-colors hover:text-brand-strong"
              >
                {indexLabel(["related", "viewAllLabel"], viewAllLabel)}
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedList.map((entry) => (
                <li key={entry.slug}>
                  <ProjectCard project={entry} categoryLabel={categoryLabel(entry.category)} />
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>
      )}

      {/* ---------------- CTA ---------------- */}
      {/* The index document owns this band; edits land there, not in the project. */}
      <ProjectCta section={cta} basePath={["cta"]} scope={INDEX} />
    </AnimatedPage>
  );
}
