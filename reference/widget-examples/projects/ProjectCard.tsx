"use client";

import Link from "next/link";
import { ArrowRight, Building2, MapPin, CalendarCheck, Ruler, Clock, Users, Compass, Banknote, Images } from "lucide-react";
import { E, EAdd, EImg, ERemove } from "@/components/cms/editable";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import { setPath, useCmsEditing, useSection } from "@/components/cms/store";
import { assetSrc } from "@/content/types";
import { hasHeroImage, type ProjectCardView } from "./projectModel";

export const humanizeSlug = (slug: string): string =>
  slug.split("-").filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");

export function ProjectCard({
  project,
  priority = false,
  categoryLabel,
  detailsLabel = "View Details",
  detailsLabelPath,
  detailsEnabled = false,
}: {
  project: ProjectCardView;
  priority?: boolean;
  categoryLabel?: string;
  detailsLabel?: string;
  detailsLabelPath?: PathSegment[];
  detailsEnabled?: boolean;
}) {
  const { editing, ready } = useCmsEditing();
  const editorMode = editing && ready;
  const scope = `doc:project-${project.slug}` as const;

  // Every card field reads and writes against the project's own CMS document.
  // The store loads rostered project documents when /projects enters edit mode.
  const title = useSection(["title"], project.title, scope);
  const summary = useSection(["summary"], project.summary, scope);
  const category = useSection(["category"], project.category, scope);
  const hero = useSection(["hero"], project.hero as any, scope);
  const location = useSection(["facts", "location"], project.facts.location, scope);
  const client = useSection(["facts", "client"], project.facts.client, scope);
  const consultant = useSection(["facts", "consultant"], project.facts.consultant, scope);
  const projectStatus = useSection(["facts", "projectStatus"], project.facts.projectStatus, scope);
  const completedOn = useSection(["facts", "completedOn"], project.facts.completedOn, scope);
  const area = useSection(["facts", "area"], project.facts.area, scope);
  const duration = useSection(["facts", "duration"], project.facts.duration, scope);
  const value = useSection(["facts", "value"], project.facts.value, scope);
  const valueVisible = useSection(["facts", "valueVisible"], false, scope);
  const gallery = useSection(["gallery"], project.gallery as any, scope) as JsonObject[];
  const scopeBlocks = useSection(["scope"], project.scope, scope) as JsonObject[];

  const heroSrc = assetSrc(hero);
  const categoryText = categoryLabel || humanizeSlug(category);
  const scopeText = scopeBlocks
    .map((block) => [block.text, ...(Array.isArray(block.items) ? block.items : [])].filter((part) => typeof part === "string").join(" "))
    .filter(Boolean)
    .join(" ");

  const fact = (
    key: string,
    label: string,
    value: string,
    icon?: typeof MapPin,
  ) => {
    if (!value && !editorMode) return null;
    const Icon = icon;
    const path: PathSegment[] = ["facts", key];
    return (
      <div key={key} className="flex items-start gap-2">
        {Icon && <Icon size={15} className="mt-0.5 shrink-0 text-brand" />}
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-medium">
            <E path={path} scope={scope} value={value} as="span" />
          </dd>
        </div>
      </div>
    );
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {hasHeroImage(heroSrc) ? (
          <EImg
            path={["hero"]}
            scope={scope}
            image={typeof hero === "string" ? { src: hero, alt: title } : (hero as any)}
            storedAs={typeof hero === "string" ? "string" : "object"}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : editorMode ? (
          <div className="relative flex h-full w-full items-center justify-center">
            <Building2 size={40} aria-hidden="true" className="text-muted-foreground" />
            <EImg path={["hero"]} scope={scope} image={{ src: "", alt: title }} storedAs="string" className="absolute inset-0 h-full w-full opacity-0" />
            <span className="pointer-events-none absolute bottom-3 rounded-md bg-background/90 px-3 py-1 text-xs font-semibold">Add project image</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center"><Building2 size={40} aria-hidden="true" className="text-muted-foreground" /></div>
        )}
        {project.status === "draft" && editorMode && <span className="absolute left-3 top-3 rounded-full bg-inverse/85 px-2.5 py-1 text-xs font-semibold text-inverse-foreground backdrop-blur">Draft</span>}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {(categoryText || editorMode) && (
          <span className="self-start rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
            <E path={["category"]} scope={scope} value={category} display={categoryText} as="span" />
          </span>
        )}
        <h3 className="mt-3 text-lg font-bold leading-snug text-foreground">
          <E path={["title"]} scope={scope} value={title} as="span" />
        </h3>
        {(summary || editorMode) && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <E path={["summary"]} scope={scope} value={summary} as="span" multilineBreaks />
          </p>
        )}

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {fact("location", "Location", location, MapPin)}
          {fact("client", "Client", client, Users)}
          {fact("consultant", "Consultant", consultant, Compass)}
          {fact("projectStatus", "Status", projectStatus)}
          {fact("completedOn", "Completion", completedOn, CalendarCheck)}
          {fact("area", "Area", area, Ruler)}
          {fact("duration", "Duration", duration, Clock)}
          {(editorMode || valueVisible) && (value || editorMode) && (
            <div className="flex items-start gap-2">
              <Banknote size={15} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <dt className="text-xs text-muted-foreground">Project Value</dt>
                <dd className="font-medium"><E path={["facts", "value"]} scope={scope} value={value} as="span" /></dd>
                {editorMode && (
                  <label data-cms-ui className="mt-1 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    <input type="checkbox" checked={valueVisible} onChange={(event) => setPath(["facts", "valueVisible"], event.currentTarget.checked, scope)} />
                    Show value to visitors
                  </label>
                )}
              </div>
            </div>
          )}
        </dl>

        {(gallery.length > 0 || editorMode) && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Images size={14} /> Gallery</p>
            <div className="flex gap-2 overflow-hidden">
              {gallery.map((image, index) => ({ image, index })).filter(({ image }) => image.visible !== false).slice(0, 3).map(({ image, index }) => {
                const src = assetSrc(image.src);
                return (
                  <div key={typeof image.id === "string" || typeof image.id === "number" ? image.id : index} className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {src ? (
                      <EImg path={["gallery", index, "src"]} scope={scope} image={{ src, alt: typeof image.alt === "string" ? image.alt : title }} storedAs="string" className="h-full w-full object-cover" />
                    ) : editorMode ? (
                      <EImg path={["gallery", index, "src"]} scope={scope} image={{ src: "", alt: typeof image.alt === "string" ? image.alt : title }} storedAs="string" className="h-full w-full opacity-0" />
                    ) : null}
                    {editorMode && <span className="absolute right-0 top-0"><ERemove label="gallery image" onRemove={() => setPath(["gallery"], gallery.filter((_, itemIndex) => itemIndex !== index), scope)} /></span>}
                  </div>
                );
              })}
              {editorMode && (
                <div className="flex min-w-20 items-center justify-center">
                  <EAdd label="Add gallery image" onAdd={() => setPath(["gallery"], [...gallery, { id: "gallery-" + Date.now(), src: "", alt: title, visible: true }], scope)} />
                </div>
              )}
            </div>
          </div>
        )}
        {(scopeText || editorMode) && (
          <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Scope: </span>
            {scopeBlocks.length ? scopeBlocks.map((block, index) => (
              <span key={String(block.id ?? index)}>
                {index > 0 ? " " : ""}
                <E path={["scope", index, "text"]} scope={scope} value={typeof block.text === "string" ? block.text : ""} as="span" multilineBreaks />
                {Array.isArray(block.items) && block.items.map((item, itemIndex) => (
                  <span key={itemIndex}>{" "}<E path={["scope", index, "items", itemIndex]} scope={scope} value={String(item)} as="span" /></span>
                ))}
              </span>
            )) : <span className="text-xs">Add scope content to this project.</span>}
            {editorMode && (
              <div className="mt-2 flex flex-wrap gap-2">
                {scopeBlocks.map((block, index) => (
                  <ERemove key={String(block.id ?? index)} label="scope block" onRemove={() => setPath(["scope"], scopeBlocks.filter((_, blockIndex) => blockIndex !== index), scope)} />
                ))}
                <EAdd label="Add scope paragraph" onAdd={() => setPath(["scope"], [...scopeBlocks, { type: "paragraph", text: "Add project scope details here." }], scope)} />
              </div>
            )}
          </div>
        )}

        {detailsEnabled && (
          <Link href={editorMode ? `${project.href}?edit=1` : project.href} className="mt-5 inline-flex items-center gap-1.5 self-start rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-contrast transition-colors hover:bg-brand-strong">
            {detailsLabelPath ? <E path={detailsLabelPath} value={detailsLabel} as="span" /> : detailsLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}
