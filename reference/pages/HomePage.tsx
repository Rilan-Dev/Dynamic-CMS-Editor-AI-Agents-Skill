"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import ClientCarousel from "@/components/client-logos";
import { EditableIcon } from "@/components/cms/EditableIcon";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { useSection } from "@/components/cms/store";
import { Button } from "@/components/ui/button";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

export default function HomePage({ content }: { content: JsonObject }) {
  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const aboutPreview = useSection(["aboutPreview"], asObject(content.aboutPreview));
  const featuredIntro = useSection(["featuredIntro"], asObject(content.featuredIntro));
  const featuredServices = useSection(
    ["featuredServices"],
    (content.featuredServices as JsonObject[]) ?? [],
  );
  const whyChoose = useSection(["whyChoose"], asObject(content.whyChoose));
  const clientsSection = useSection(["clientsSection"], asObject(content.clientsSection));
  const cta = useSection(["cta"], asObject(content.cta));

  return (
    <AnimatedPage id="home" label="Home page" animations={animations} className="flex flex-col">
      <AnimatedSection id="hero" label="Home hero" className="relative h-[80vh] w-full">
        <AnimatedElement id="hero-image" type="image" label="Home hero image" className="absolute inset-0">
          <EImg
            path={["hero", "image"]}
            image={hero.image as any}
            className="h-full w-full bg-white/50 object-cover"
            style={{ width: "100%", height: "100%" }}
          />
        </AnimatedElement>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto flex h-full flex-col justify-center px-4 md:px-6">
          <div className="max-w-3xl">
            <AnimatedElement
              id="hero-title"
              type="heading"
              label="Home hero title"
              as="h1"
              className="mb-4 text-2xl font-bold text-white md:text-5xl lg:text-6xl"
            >
              <E path={["hero", "title"]} value={String(hero.title ?? "")} as="span" className="block" />
            </AnimatedElement>
            <AnimatedElement
              id="hero-description"
              type="text"
              label="Home hero description"
              as="p"
              className="mb-8 max-w-2xl text-xl text-white/90"
            >
              <E path={["hero", "description"]} value={String(hero.description ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement id="hero-actions" type="button" label="Home hero buttons" className="flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-green-700 hover:bg-green-800">
                <Link href="/contact">
                  <E path={["hero", "ctaContact"]} value={String(hero.ctaContact ?? "")} as="span" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                <Link href="/services">
                  <E path={["hero", "ctaServices"]} value={String(hero.ctaServices ?? "")} as="span" />
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="aboutPreview" label="About preview" className="bg-white py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="md:w-1/2">
              <AnimatedElement id="about-title" type="heading" label="About preview heading" as="h2" className="mb-4 text-3xl font-bold text-gray-900">
                <E path={["aboutPreview", "title"]} value={String(aboutPreview.title ?? "")} as="span" />
              </AnimatedElement>
              <AnimatedElement id="about-description" type="text" label="About preview description" as="p" className="mb-6 text-lg text-gray-700">
                <E path={["aboutPreview", "description"]} value={String(aboutPreview.description ?? "")} as="span" />
              </AnimatedElement>
              <AnimatedElement id="about-button" type="button" label="About preview button" className="inline-block">
                <Button asChild className="bg-green-700 hover:bg-green-800">
                  <Link href="/about">
                    <E path={["aboutPreview", "buttonText"]} value={String(aboutPreview.buttonText ?? "")} as="span" />
                  </Link>
                </Button>
              </AnimatedElement>
            </div>
            <AnimatedElement id="about-image" type="image" label="About preview image" className="relative h-[400px] w-full overflow-hidden rounded-lg shadow-xl md:w-1/2">
              <EImg
                path={["aboutPreview", "image"]}
                image={aboutPreview.image as any}
                className="h-full w-full object-cover object-bottom"
              />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="featuredServices" label="Featured services" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement id="services-heading" type="heading" label="Featured services heading" as="h2" className="mb-4 text-3xl font-bold text-gray-900">
              <E path={["featuredIntro", "title"]} value={String(featuredIntro.title ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement id="services-subtitle" type="text" label="Featured services subtitle" as="p" className="mx-auto max-w-3xl text-lg text-gray-700">
              <E path={["featuredIntro", "subtitle"]} value={String(featuredIntro.subtitle ?? "")} as="span" />
            </AnimatedElement>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {featuredServices.map((service, index) => {
              const itemId = String(service.id ?? `featured-service-${index}`);
              return (
                <AnimatedElement
                  key={itemId}
                  id={itemId}
                  type="card"
                  label={String(service.title ?? `Service ${index + 1}`)}
                  sectionId="featuredServices"
                  staggerIndex={index}
                  className="rounded-lg border border-gray-100 bg-white p-6 shadow-lg transition-transform duration-300 hover:scale-105"
                >
                  <EditableIcon
                    path={["featuredServices", index, "icon"]}
                    value={service.icon}
                    alt={String(service.title ?? "")}
                    fallback="Wrench"
                    className="mb-4 h-10 w-10 text-green-700"
                  />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    <E path={["featuredServices", index, "title"]} value={String(service.title ?? "")} as="span" />
                  </h3>
                  <p className="mb-4 text-gray-700">
                    <E path={["featuredServices", index, "description"]} value={String(service.description ?? "")} as="span" />
                  </p>
                  <Link href="/services" className="inline-flex items-center font-medium text-green-700 hover:underline">
                    <E path={["featuredIntro", "linkText"]} value={String(featuredIntro.linkText ?? "")} as="span" />
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </AnimatedElement>
              );
            })}
          </div>
          <AnimatedElement id="services-button" type="button" label="View all services button" className="mt-12 text-center">
            <Button asChild className="bg-green-700 hover:bg-green-800">
              <Link href="/services">
                <E path={["featuredIntro", "buttonText"]} value={String(featuredIntro.buttonText ?? "")} as="span" />
              </Link>
            </Button>
          </AnimatedElement>
        </div>
      </AnimatedSection>

      <AnimatedSection id="whyChoose" label="Why choose us" className="bg-green-700 py-20 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement id="why-heading" type="heading" label="Why choose us heading" as="h2" className="mb-4 text-3xl font-bold">
              <E path={["whyChoose", "title"]} value={String(whyChoose.title ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement id="why-description" type="text" label="Why choose us description" as="p" className="mx-auto max-w-3xl text-lg text-white/90">
              <E path={["whyChoose", "description"]} value={String(whyChoose.description ?? "")} as="span" />
            </AnimatedElement>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {(Array.isArray(whyChoose.cards) ? (whyChoose.cards as JsonObject[]) : []).map((item, index) => {
              const itemId = String(item.id ?? `why-card-${index}`);
              return (
                <AnimatedElement key={itemId} id={itemId} type="card" label={String(item.title ?? `Reason ${index + 1}`)} sectionId="whyChoose" staggerIndex={index} className="rounded-lg bg-green-800/50 p-6">
                  <EditableIcon path={["whyChoose", "cards", index, "icon"]} value={item.icon} fallback="CheckCircle" className="mb-4 h-10 w-10 text-white" />
                  <h3 className="mb-2 text-xl font-bold text-white">
                    <E path={["whyChoose", "cards", index, "title"]} value={String(item.title ?? "")} as="span" />
                  </h3>
                  <p className="text-white/80">
                    <E path={["whyChoose", "cards", index, "description"]} value={String(item.description ?? "")} as="span" />
                  </p>
                </AnimatedElement>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="clients" label="Clients" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-10 text-center">
            <AnimatedElement id="clients-heading" type="heading" label="Clients heading" as="h2" className="mb-4 text-3xl font-bold text-gray-900">
              <E path={["clientsSection", "title"]} value={String(clientsSection.title ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement id="clients-description" type="text" label="Clients description" as="p" className="mx-auto max-w-3xl text-lg text-gray-700">
              <E path={["clientsSection", "description"]} value={String(clientsSection.description ?? "")} as="span" />
            </AnimatedElement>
          </div>
          <AnimatedElement id="clients-carousel" type="listItem" label="Client logos carousel">
            <ClientCarousel />
          </AnimatedElement>
        </div>
      </AnimatedSection>

      <AnimatedSection id="cta" label="Home call to action" className="bg-gradient-to-r from-green-700 to-green-900 py-20 text-white">
        <div className="container mx-auto px-4 text-center md:px-6">
          <AnimatedElement id="cta-heading" type="heading" label="Home call to action heading" as="h2" className="mb-4 text-3xl font-bold">
            <E path={["cta", "title"]} value={String(cta.title ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement id="cta-description" type="text" label="Home call to action description" as="p" className="mx-auto mb-8 max-w-2xl text-xl">
            <E path={["cta", "description"]} value={String(cta.description ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement id="cta-button" type="button" label="Home call to action button" className="inline-block">
            <Button asChild size="lg" className="bg-white text-green-700 hover:bg-gray-100">
              <Link href="/contact">
                <E path={["cta", "button"]} value={String(cta.button ?? "")} as="span" />
              </Link>
            </Button>
          </AnimatedElement>
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
