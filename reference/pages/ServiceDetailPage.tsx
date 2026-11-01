"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import { useSection } from "@/components/cms/store";
import { ServiceAbout } from "@/components/services/detail/ServiceAbout";
import { ServiceApplications } from "@/components/services/detail/ServiceApplications";
import { ServiceCta } from "@/components/services/detail/ServiceCta";
import { ServiceDetailHero } from "@/components/services/detail/ServiceDetailHero";
import { ServiceFaq } from "@/components/services/detail/ServiceFaq";
import { ServiceProcess } from "@/components/services/detail/ServiceProcess";
import { ServiceProjects } from "@/components/services/detail/ServiceProjects";
import { ServiceSpecialists } from "@/components/services/detail/ServiceSpecialists";
import { ServiceWhyChoose } from "@/components/services/detail/ServiceWhyChoose";
import { InheritedSectionControls } from "@/components/services/detail/InheritedSectionControls";
import type { ProjectCardView } from "@/components/projects/projectModel";
import { serviceHref } from "@/components/services/serviceCatalog";
import {
  DETAIL_SECTION_KEYS,
  resolveDetailSection,
  type DetailSectionKey,
} from "@/components/services/serviceHierarchy";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asObjects = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.map(asObject) : [];

const SECTION_COMPONENTS: Record<
  Exclude<DetailSectionKey, "hero" | "projects">,
  (props: { section: JsonObject; basePath: PathSegment[] }) => ReactNode
> = {
  about: ServiceAbout,
  process: ServiceProcess,
  applications: ServiceApplications,
  whyChoose: ServiceWhyChoose,
  faq: ServiceFaq,
  cta: ServiceCta,
};

export default function ServiceDetailPage({
  content,
  parentIndex,
  childIndex,
  linkedProjects,
}: {
  content: JsonObject;
  parentIndex: number;
  childIndex: number | null;
  /** Published projects that reference the service currently on screen. */
  linkedProjects: ProjectCardView[];
}) {
  const services = useSection(
    ["services"],
    (content.services as JsonObject[]) ?? [],
  );
  const list = asObjects(services);
  const parent = asObject(list[parentIndex]);
  const children = asObjects(parent.children);
  const child = childIndex === null ? null : asObject(children[childIndex]);

  const animations = useSection(["animations"], asObject(content.animations));

  const parentDetailPath: PathSegment[] = ["services", parentIndex, "detail"];
  const childDetailPath: PathSegment[] =
    childIndex === null
      ? parentDetailPath
      : ["services", parentIndex, "children", childIndex, "detail"];

  const sectionFor = (key: DetailSectionKey) => {
    const { section, source } = resolveDetailSection(
      parent.detail,
      child?.detail ?? null,
      key,
    );
    const basePath: PathSegment[] =
      source === "child"
        ? [...childDetailPath, key]
        : [...parentDetailPath, key];
    return { section, source, basePath };
  };

  const hero = sectionFor("hero");
  const childTitle = String(child?.title ?? parent.title ?? "this service");
  const currentServiceSlug = String((child ?? parent).slug ?? "");

  const aboutSection = sectionFor("about").section;
  const aboutVisible = !!aboutSection && aboutSection.visible !== false;
  const specialists = (
    <ServiceSpecialists
      parent={parent}
      parentIndex={parentIndex}
      activeChildSlug={child ? String(child.slug ?? "") : null}
    />
  );

  return (
    <AnimatedPage
      id="serviceDetail"
      label="Service detail page"
      animations={animations}
      className="flex flex-col"
    >
      {hero.section && hero.section.visible !== false && (
        <ServiceDetailHero section={hero.section} basePath={hero.basePath}>
          {child && (
            <p className="mt-8">
              <Link
                href={serviceHref({ slug: String(parent.slug ?? "") })}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-strong"
              >
                <span aria-hidden="true">&larr;</span>
                Part of {String(parent.title ?? "our services")}
              </Link>
            </p>
          )}
        </ServiceDetailHero>
      )}

      {DETAIL_SECTION_KEYS.filter(
        (key): key is Exclude<DetailSectionKey, "hero"> => key !== "hero",
      ).map((key) => {
        const { section, source, basePath } = sectionFor(key);
        if (!section || section.visible === false) return null;
        return (
          <div key={key} className="relative">
            <InheritedSectionControls
              sectionKey={key}
              source={source}
              parentSection={
                resolveDetailSection(parent.detail, null, key).section
              }
              childDetailPath={childDetailPath}
              childIndex={childIndex}
              childTitle={childTitle}
            />
            {key === "projects" ? (
              <ServiceProjects
                section={section}
                basePath={basePath}
                linkedProjects={linkedProjects}
                serviceSlug={currentServiceSlug}
              />
            ) : (
              (() => {
                const Section = SECTION_COMPONENTS[key];
                return <Section section={section} basePath={basePath} />;
              })()
            )}
            {key === "about" && specialists}
          </div>
        );
      })}

      {/* About may be hidden or inherited away; the line-up still belongs on the page. */}
      {!aboutVisible && specialists}
    </AnimatedPage>
  );
}
