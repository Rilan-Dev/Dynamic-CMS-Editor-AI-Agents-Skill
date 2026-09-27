"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { EditableIcon } from "@/components/cms/EditableIcon";
import { E, EAdd, EImg, ERemove } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing, useSection } from "@/components/cms/store";
import {
  SERVICES_PER_PAGE,
  serviceAnchorId,
  visibleOrderedServices,
  type ServiceCatalogItem,
} from "@/components/services/serviceCatalog";
import { useServiceAnchorNavigation } from "@/components/services/useServiceAnchorNavigation";
import { assetSrc } from "@/content/types";

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

export default function ServicesPage({ content }: { content: JsonObject }) {
  const { editing, ready } = useCmsEditing();
  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const description = useSection(["description"], asObject(content.description));
  const services = useSection(["services"], (content.services as JsonObject[]) ?? []);
  const quality = useSection(["quality"], asObject(content.quality));
  const clientApproach = useSection(["clientApproach"], asObject(content.clientApproach));

  const list = useMemo(() => (Array.isArray(services) ? services : []), [services]);
  const ordered = useMemo(() => visibleOrderedServices(list), [list]);
  const originalIndexById = useMemo(() => {
    const result = new Map<string, number>();
    list.forEach((service, index) => {
      const id = typeof service.id === "string" ? service.id : "";
      if (id && !result.has(id)) result.set(id, index);
    });
    return result;
  }, [list]);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(
    1,
    Math.ceil(ordered.length / SERVICES_PER_PAGE),
  );
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);
  const visibleServices = ordered.slice(
    page * SERVICES_PER_PAGE,
    page * SERVICES_PER_PAGE + SERVICES_PER_PAGE,
  );
  const highlightedServiceId = useServiceAnchorNavigation({
    services: ordered,
    page,
    setPage,
  });
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const isNew = (service: ServiceCatalogItem) =>
    now !== null &&
    typeof service.addedAt === "string" &&
    now - Date.parse(service.addedAt) < NEW_WINDOW_MS;

  const addService = () => {
    setPath(
      ["services"],
      [
        ...list,
        {
          id: createCmsItemId("service"),
          title: "New Service",
          description: "Describe this service.",
          icon: "/images/services-icons/building-contracting.svg",
          image: "/placeholder.svg",
          addedAt: new Date().toISOString(),
          visible: true,
        },
      ] as any,
    );
    setPage(0);
  };

  const removeService = (originalIndex: number) =>
    setPath(["services"], list.filter((_, index) => index !== originalIndex) as any);

  const renderParagraphs = (
    section: "quality" | "clientApproach",
    value: JsonObject,
    colorClass: string,
  ) =>
    (Array.isArray(value.paragraphs) ? (value.paragraphs as string[]) : []).map(
      (text, index, paragraphs) => (
        <AnimatedElement
          key={index}
          id={`${section}-paragraph-${index}`}
          type="text"
          label={`${section} paragraph ${index + 1}`}
          staggerIndex={index}
          as="p"
          className={index < paragraphs.length - 1 ? `${colorClass} mb-4` : colorClass}
        >
          <E path={[section, "paragraphs", index]} value={text} as="span" />
        </AnimatedElement>
      ),
    );

  return (
    <AnimatedPage id="services" label="Services page" animations={animations} className="flex flex-col">
      <AnimatedSection id="hero" label="Services hero" className="relative h-[40vh] w-full">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <AnimatedElement id="hero-image" type="image" label="Services hero image" className="absolute inset-0">
          <EImg path={["hero", "image"]} image={hero.image as any} className="h-full w-full object-cover" />
        </AnimatedElement>
        <div className="container relative z-20 mx-auto flex h-full flex-col justify-center px-4 md:px-6">
          <AnimatedElement id="hero-title" type="heading" label="Services hero title" as="h1" className="mb-4 text-4xl font-bold text-white md:text-5xl">
            <E path={["hero", "title"]} value={String(hero.title ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement id="hero-description" type="text" label="Services hero description" as="p" className="max-w-2xl text-xl text-white/90">
            <E path={["hero", "description"]} value={String(hero.description ?? "")} as="span" />
          </AnimatedElement>
        </div>
      </AnimatedSection>

      <AnimatedSection id="servicesList" label="Services list" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement id="services-list-title" type="heading" label="Services list heading" as="h2" className="mb-4 text-3xl font-bold text-gray-900">
              <E path={["description", "title"]} value={String(description.title ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement id="services-list-subtitle" type="text" label="Services list subtitle" as="p" className="mx-auto max-w-3xl text-lg text-gray-700">
              <E path={["description", "subtitle"]} value={String(description.subtitle ?? "")} as="span" />
            </AnimatedElement>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleServices.map((service, visibleIndex) => {
              const itemId = service.id;
              const originalIndex = originalIndexById.get(itemId);
              if (originalIndex === undefined) return null;
              return (
                <AnimatedElement
                  key={itemId}
                  id={itemId}
                  domId={serviceAnchorId(itemId)}
                  tabIndex={-1}
                  as="article"
                  type="card"
                  label={service.title}
                  sectionId="servicesList"
                  staggerIndex={visibleIndex}
                  className={`relative overflow-hidden rounded-lg border bg-white shadow-lg transition-[transform,box-shadow,border-color] duration-300 hover:scale-105 focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-green-700 ${
                    highlightedServiceId === itemId
                      ? "border-green-700 ring-4 ring-green-500/50 motion-reduce:transition-none"
                      : "border-gray-200"
                  }`}
                >
                  {isNew(service) && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-green-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                      New
                    </span>
                  )}
                  {editing && ready && (
                    <ERemove onRemove={() => removeService(originalIndex)} label={service.title} />
                  )}
                  <AnimatedElement id={`${itemId}:image`} type="image" label={`${service.title} image`} sectionId="servicesList" className="relative h-48 w-full">
                    <EImg
                      path={["services", originalIndex, "image"]}
                      image={{ src: assetSrc(service.image), alt: service.title }}
                      storedAs="string"
                      className="h-full w-full object-cover"
                    />
                  </AnimatedElement>
                  <div className="p-6">
                    <AnimatedElement id={`${itemId}:icon`} type="icon" label={`${service.title} icon`} sectionId="servicesList" className="mb-4 h-12 w-12">
                      <EditableIcon
                        path={["services", originalIndex, "icon"]}
                        value={service.icon}
                        alt={service.title}
                        fallback="Wrench"
                        className="h-full w-full object-contain text-green-700"
                      />
                    </AnimatedElement>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      <E path={["services", originalIndex, "title"]} value={service.title} as="span" />
                    </h3>
                    <p className="text-gray-700">
                      <E path={["services", originalIndex, "description"]} value={String(service.description ?? "")} as="span" />
                    </p>
                    {editing && ready && (
                      <p className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Order
                        <E
                          path={["services", originalIndex, "order"]}
                          value={String(service.order ?? "")}
                          as="span"
                          numeric
                          className="min-w-8 rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-900"
                        />
                      </p>
                    )}
                  </div>
                </AnimatedElement>
              );
            })}
          </div>

          {editing && ready && (
            <div className="mt-8 flex justify-center">
              <EAdd onAdd={addService} label="Add service" />
            </div>
          )}

          {pageCount > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Services pagination">
              <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index)}
                  aria-current={page === index ? "page" : undefined}
                  className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${page === index ? "bg-green-700 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                >
                  {index + 1}
                </button>
              ))}
              <button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page === pageCount - 1} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </nav>
          )}
        </div>
      </AnimatedSection>

      <AnimatedSection id="quality" label="Quality assurance" className="bg-green-700 py-16 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="md:w-1/2">
              <AnimatedElement id="quality-title" type="heading" label="Quality assurance heading" as="h2" className="mb-6 text-3xl font-bold">
                <E path={["quality", "title"]} value={String(quality.title ?? "")} as="span" />
              </AnimatedElement>
              {renderParagraphs("quality", quality, "text-lg text-white/90")}
            </div>
            <AnimatedElement id="quality-image" type="image" label="Quality assurance image" className="relative h-100 w-full overflow-hidden rounded-lg md:w-1/2">
              <EImg path={["quality", "image"]} image={quality.image as any} className="h-full w-full object-cover" />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="clientApproach" label="Client-centric approach" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row-reverse">
            <div className="md:w-1/2">
              <AnimatedElement id="client-approach-title" type="heading" label="Client-centric approach heading" as="h2" className="mb-6 text-3xl font-bold text-gray-900">
                <E path={["clientApproach", "title"]} value={String(clientApproach.title ?? "")} as="span" />
              </AnimatedElement>
              {renderParagraphs("clientApproach", clientApproach, "text-lg text-gray-700")}
            </div>
            <AnimatedElement id="client-approach-image" type="image" label="Client-centric approach image" className="relative h-100 w-full overflow-hidden rounded-lg shadow-xl md:w-1/2">
              <EImg path={["clientApproach", "image"]} image={clientApproach.image as any} className="h-full w-full object-cover" />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
