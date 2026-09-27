"use client";

import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { EditableIcon } from "@/components/cms/EditableIcon";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { useSection } from "@/components/cms/store";
import { assetSrc } from "@/content/types";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

export default function AboutPage({ content }: { content: JsonObject }) {
  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const overview = useSection(["overview"], asObject(content.overview));
  const history = useSection(["history"], asObject(content.history));
  const visionMission = useSection(["visionMission"], asObject(content.visionMission));
  const directorMessage = useSection(["directorMessage"], asObject(content.directorMessage));
  const groupCompaniesTitle = useSection(
    ["groupCompaniesTitle"],
    String(content.groupCompaniesTitle ?? ""),
  );
  const groupCompanies = useSection(
    ["groupCompanies"],
    (content.groupCompanies as JsonObject[]) ?? [],
  );

  return (
    <AnimatedPage id="about" label="About page" animations={animations} className="flex flex-col">
      <AnimatedSection id="hero" label="About hero" className="relative h-[40vh] w-full">
        <AnimatedElement id="hero-image" type="image" label="About hero image" className="absolute inset-0">
          <EImg path={["hero", "image"]} image={hero.image as any} className="h-full w-full object-cover" />
        </AnimatedElement>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto flex h-full flex-col justify-center px-4 md:px-6">
          <AnimatedElement id="hero-title" type="heading" label="About hero title" as="h1" className="mb-4 text-4xl font-bold text-white md:text-5xl">
            <E path={["hero", "title"]} value={String(hero.title ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement id="hero-description" type="text" label="About hero description" as="p" className="max-w-2xl text-xl text-white/90">
            <E path={["hero", "description"]} value={String(hero.description ?? "")} as="span" />
          </AnimatedElement>
        </div>
      </AnimatedSection>

      <AnimatedSection id="overview" label="Company overview" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="md:w-1/2">
              <AnimatedElement id="overview-title" type="heading" label="Company overview heading" as="h2" className="mb-6 text-3xl font-bold text-gray-900">
                <E path={["overview", "title"]} value={String(overview.title ?? "")} as="span" />
              </AnimatedElement>
              <div className="space-y-4 text-lg text-gray-700">
                {(Array.isArray(overview.paragraphs) ? (overview.paragraphs as string[]) : []).map((text, index) => (
                  <AnimatedElement key={index} id={`overview-paragraph-${index}`} type="text" label={`Company overview paragraph ${index + 1}`} staggerIndex={index} as="p">
                    <E path={["overview", "paragraphs", index]} value={text} as="span" />
                  </AnimatedElement>
                ))}
              </div>
            </div>
            <AnimatedElement id="overview-image" type="image" label="Company overview image" className="relative h-[400px] w-full overflow-hidden rounded-lg shadow-xl md:w-1/2">
              <EImg path={["overview", "image"]} image={overview.image as any} className="h-full w-full object-cover" />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="history" label="Company history" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row-reverse">
            <div className="md:w-1/2">
              <AnimatedElement id="history-title" type="heading" label="Company history heading" as="h2" className="mb-6 text-3xl font-bold text-gray-900">
                <E path={["history", "title"]} value={String(history.title ?? "")} as="span" />
              </AnimatedElement>
              <AnimatedElement id="history-description" type="text" label="Company history description" as="p" className="mb-4 text-lg text-gray-700">
                <E path={["history", "description"]} value={String(history.description ?? "")} as="span" />
              </AnimatedElement>
              {(history.extra || history.extra === "") && (
                <AnimatedElement id="history-extra" type="text" label="Company history extra text" as="p" className="text-lg text-gray-700">
                  <E path={["history", "extra"]} value={String(history.extra ?? "")} as="span" />
                </AnimatedElement>
              )}
            </div>
            <AnimatedElement id="history-image" type="image" label="Company history image" className="relative h-[400px] w-full overflow-hidden rounded-lg shadow-xl md:w-1/2">
              <EImg path={["history", "image"]} image={history.image as any} className="h-full w-full object-cover" />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="visionMission" label="Vision and mission" className="bg-green-700 py-16 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement id="vision-mission-title" type="heading" label="Vision and mission heading" as="h2" className="mb-4 text-3xl font-bold">
              <E path={["visionMission", "title"]} value={String(visionMission.title ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement id="vision-mission-description" type="text" label="Vision and mission description" as="p" className="mx-auto max-w-3xl text-lg text-white/90">
              <E path={["visionMission", "description"]} value={String(visionMission.description ?? "")} as="span" />
            </AnimatedElement>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {[
              {
                id: "vision",
                iconKey: "visionIcon",
                headingKey: "visionHeading",
                textKey: "vision",
                fallback: "Target",
              },
              {
                id: "mission",
                iconKey: "missionIcon",
                headingKey: "missionHeading",
                textKey: "mission",
                fallback: "Briefcase",
              },
            ].map((item, index) => (
              <AnimatedElement key={item.id} id={item.id} type="card" label={`${item.id} card`} sectionId="visionMission" staggerIndex={index} className="rounded-lg bg-green-800/50 p-8">
                <div className="mb-4 flex items-center">
                  <EditableIcon path={["visionMission", item.iconKey]} value={visionMission[item.iconKey]} fallback={item.fallback} className="mr-3 h-8 w-8" />
                  <h3 className="text-2xl font-bold">
                    <E path={["visionMission", item.headingKey]} value={String(visionMission[item.headingKey] ?? "")} as="span" />
                  </h3>
                </div>
                <p className="text-lg text-white/90">
                  <E path={["visionMission", item.textKey]} value={String(visionMission[item.textKey] ?? "")} as="span" />
                </p>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="directorMessage" label="Managing director message" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <AnimatedElement id="director-image" type="image" label="Managing director image" className="relative h-[800px] w-full overflow-hidden rounded-lg shadow-xl md:w-1/3">
              <EImg path={["directorMessage", "image"]} image={directorMessage.image as any} className="h-full w-full object-cover" />
            </AnimatedElement>
            <div className="md:w-2/3">
              <AnimatedElement id="director-title" type="heading" label="Managing director message heading" as="h2" className="mb-6 text-3xl font-bold text-gray-900">
                <E path={["directorMessage", "title"]} value={String(directorMessage.title ?? "")} as="span" />
              </AnimatedElement>
              <blockquote className="mb-6 border-l-4 border-green-700 pl-6 text-lg text-gray-700">
                {(Array.isArray(directorMessage.paragraphs) ? (directorMessage.paragraphs as string[]) : []).map((text, index) => (
                  <AnimatedElement key={index} id={`director-paragraph-${index}`} type="text" label={`Managing director paragraph ${index + 1}`} staggerIndex={index} as="p" className="mb-4">
                    <E path={["directorMessage", "paragraphs", index]} value={text} as="span" />
                  </AnimatedElement>
                ))}
              </blockquote>
              <AnimatedElement id="director-name" type="heading" label="Managing director name" as="p" className="text-xl font-semibold text-gray-900">
                <E path={["directorMessage", "name"]} value={String(directorMessage.name ?? "")} as="span" />
              </AnimatedElement>
              <AnimatedElement id="director-role" type="text" label="Managing director role" as="p" className="text-gray-600">
                <E path={["directorMessage", "role"]} value={String(directorMessage.role ?? "")} as="span" />
              </AnimatedElement>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="groupCompanies" label="Group companies" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement id="group-companies-title" type="heading" label="Group companies heading" as="h2" className="mb-4 text-3xl font-bold text-gray-900">
              <E path={["groupCompaniesTitle"]} value={groupCompaniesTitle} as="span" />
            </AnimatedElement>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {groupCompanies.map((company, index) => {
              const itemId = String(company.id ?? `group-company-${index}`);
              return (
                <AnimatedElement key={itemId} id={itemId} type="card" label={String(company.name ?? `Group company ${index + 1}`)} sectionId="groupCompanies" staggerIndex={index} className="overflow-hidden rounded-lg bg-gray-50 shadow-lg">
                  <div className="relative h-[280px] w-full">
                    <EImg
                      path={["groupCompanies", index, "image"]}
                      image={{ src: assetSrc(company.image), alt: String(company.name ?? "") }}
                      storedAs="string"
                      className="h-full w-full object-contain p-6"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      <E path={["groupCompanies", index, "name"]} value={String(company.name ?? "")} as="span" />
                    </h3>
                    <p className="text-gray-700">
                      <E path={["groupCompanies", index, "description"]} value={String(company.description ?? "")} as="span" />
                    </p>
                  </div>
                </AnimatedElement>
              );
            })}
          </div>
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
