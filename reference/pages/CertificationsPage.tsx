"use client";

import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { EditableIcon } from "@/components/cms/EditableIcon";
import { E, EAdd, EImg } from "@/components/cms/editable";
import {
  createCmsItemId,
  duplicateListItem,
  InlineListControls,
  moveListItem,
  removeListItem,
  toggleListItemVisibility,
} from "@/components/cms/InlineListControls";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing, useSection } from "@/components/cms/store";
import { assetSrc } from "@/content/types";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const blankCertificate = (): JsonObject => ({
  id: createCmsItemId("certificate"),
  title: "New Certificate",
  description: "Add the certificate description.",
  image: "",
  icon: "Award",
  issuer: "",
  issuedAt: "",
  certificateNumber: "",
  verificationUrl: "",
  visible: true,
});

export default function CertificationsPage({ content }: { content: JsonObject }) {
  const { editing, ready } = useCmsEditing();
  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const registrationsIntro = useSection(
    ["registrationsIntro"],
    asObject(content.registrationsIntro),
  );
  const registrations = useSection(
    ["registrations"],
    (content.registrations as JsonObject[]) ?? [],
  );
  const isoIntro = useSection(["isoIntro"], asObject(content.isoIntro));
  const isoCertifications = useSection(
    ["isoCertifications"],
    (content.isoCertifications as JsonObject[]) ?? [],
  );
  const appreciation = useSection(["appreciation"], asObject(content.appreciation));
  const safety = useSection(["safety"], asObject(content.safety));
  const benefitsIntro = useSection(["benefitsIntro"], asObject(content.benefitsIntro));
  const benefits = useSection(
    ["benefits"],
    (content.benefits as JsonObject[]) ?? [],
  );
  const editActive = editing && ready;

  const updateList = (path: "registrations" | "isoCertifications", next: JsonObject[]) =>
    setPath([path], next);

  const renderCertificateGrid = (
    path: "registrations" | "isoCertifications",
    items: JsonObject[],
    imageHeight: string,
  ) => (
    <>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {items.map((certificate, index) => {
          const visible = certificate.visible !== false;
          if (!visible && !editActive) return null;
          const itemId = String(certificate.id ?? `${path}-${index}`);
          const title = String(certificate.title ?? "");
          const issuer = String(certificate.issuer ?? "");
          const issuedAt = String(certificate.issuedAt ?? "");
          const certificateNumber = String(certificate.certificateNumber ?? "");
          const verificationUrl = String(certificate.verificationUrl ?? "");

          return (
            <AnimatedElement
              key={itemId}
              id={itemId}
              type="card"
              label={title || `${path} certificate ${index + 1}`}
              sectionId={path}
              staggerIndex={index}
              className={`relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${
                visible ? "" : "opacity-55 ring-2 ring-amber-400"
              }`}
            >
              <InlineListControls
                label={title || "certificate"}
                index={index}
                count={items.length}
                visible={visible}
                onMove={(toIndex) => updateList(path, moveListItem(items, index, toIndex))}
                onDuplicate={() =>
                  updateList(
                    path,
                    duplicateListItem(items, index, createCmsItemId("certificate")),
                  )
                }
                onToggleVisibility={() =>
                  updateList(path, toggleListItemVisibility(items, index))
                }
                onRemove={() => {
                  if (
                    typeof window === "undefined" ||
                    window.confirm(`Remove “${title || "this certificate"}” from the draft?`)
                  ) {
                    updateList(path, removeListItem(items, index));
                  }
                }}
              />

              {!visible && editActive && (
                <span className="absolute left-3 top-3 z-30 rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white">
                  Hidden
                </span>
              )}

              <AnimatedElement
                id={`${itemId}:image`}
                type="image"
                label={`${title || "Certificate"} image`}
                sectionId={path}
                className={`relative w-full ${imageHeight}`}
              >
                <EImg
                  path={[path, index, "image"]}
                  image={{ src: assetSrc(certificate.image), alt: title }}
                  storedAs="string"
                  className="h-full w-full object-contain p-4"
                />
              </AnimatedElement>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="mb-4 flex items-center">
                    <AnimatedElement
                      id={`${itemId}:icon`}
                      type="icon"
                      label={`${title || "Certificate"} icon`}
                      sectionId={path}
                      className="mr-3"
                    >
                      <EditableIcon
                        path={[path, index, "icon"]}
                        value={certificate.icon}
                        fallback="Award"
                        className="h-8 w-8 text-green-700"
                      />
                    </AnimatedElement>
                    <AnimatedElement
                      id={`${itemId}:title`}
                      type="heading"
                      label={`${title || "Certificate"} title`}
                      sectionId={path}
                      as="h3"
                      className="text-xl font-bold text-gray-900"
                    >
                      <E path={[path, index, "title"]} value={title} as="span" />
                    </AnimatedElement>
                  </div>
                  <AnimatedElement
                    id={`${itemId}:description`}
                    type="text"
                    label={`${title || "Certificate"} description`}
                    sectionId={path}
                    as="p"
                    className="text-gray-700"
                  >
                    <E
                      path={[path, index, "description"]}
                      value={String(certificate.description ?? "")}
                      as="span"
                      multilineBreaks
                    />
                  </AnimatedElement>

                  {(editActive || issuer || issuedAt || certificateNumber) && (
                    <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                      {(editActive || issuer) && (
                        <div>
                          <dt className="font-semibold">Issuer</dt>
                          <dd>
                            <E path={[path, index, "issuer"]} value={issuer} as="span" />
                          </dd>
                        </div>
                      )}
                      {(editActive || issuedAt) && (
                        <div>
                          <dt className="font-semibold">Issued</dt>
                          <dd>
                            <E path={[path, index, "issuedAt"]} value={issuedAt} as="span" />
                          </dd>
                        </div>
                      )}
                      {(editActive || certificateNumber) && (
                        <div>
                          <dt className="font-semibold">Certificate number</dt>
                          <dd>
                            <E
                              path={[path, index, "certificateNumber"]}
                              value={certificateNumber}
                              as="span"
                            />
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {verificationUrl && (
                    <a
                      href={verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex text-sm font-semibold text-green-700 hover:text-green-900"
                    >
                      Verify certificate
                    </a>
                  )}
                </div>
              </div>
            </AnimatedElement>
          );
        })}
      </div>
      <div className="mt-8 flex justify-center">
        <EAdd
          label={`Add ${path === "registrations" ? "registration" : "ISO certificate"}`}
          onAdd={() => updateList(path, [...items, blankCertificate()])}
        />
      </div>
    </>
  );

  return (
    <AnimatedPage
      id="certifications"
      label="Certifications page"
      animations={animations}
      className="flex flex-col"
    >
      <AnimatedSection
        id="hero"
        label="Certifications hero"
        className="relative h-[40vh] w-full"
      >
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <AnimatedElement
          id="hero-image"
          type="image"
          label="Certifications hero image"
          className="absolute inset-0"
        >
          <EImg
            path={["hero", "image"]}
            image={hero.image as any}
            className="h-full w-full object-cover"
          />
        </AnimatedElement>
        <div className="container relative z-20 mx-auto flex h-full flex-col justify-center px-4 md:px-6">
          <AnimatedElement
            id="hero-title"
            type="heading"
            label="Certifications hero title"
            as="h1"
            className="mb-4 text-4xl font-bold text-white md:text-5xl"
          >
            <E path={["hero", "title"]} value={String(hero.title ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement
            id="hero-description"
            type="text"
            label="Certifications hero description"
            as="p"
            className="max-w-2xl text-xl text-white/90"
          >
            <E
              path={["hero", "description"]}
              value={String(hero.description ?? "")}
              as="span"
            />
          </AnimatedElement>
        </div>
      </AnimatedSection>

      <AnimatedSection id="registrations" label="Company registrations" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement
              id="registrations-heading"
              type="heading"
              label="Company registrations heading"
              as="h2"
              className="mb-4 text-3xl font-bold text-gray-900"
            >
              <E
                path={["registrationsIntro", "title"]}
                value={String(registrationsIntro.title ?? "")}
                as="span"
              />
            </AnimatedElement>
            <AnimatedElement
              id="registrations-subtitle"
              type="text"
              label="Company registrations subtitle"
              as="p"
              className="mx-auto max-w-3xl text-lg text-gray-700"
            >
              <E
                path={["registrationsIntro", "subtitle"]}
                value={String(registrationsIntro.subtitle ?? "")}
                as="span"
              />
            </AnimatedElement>
          </div>
          {renderCertificateGrid("registrations", registrations, "h-[400px]")}
        </div>
      </AnimatedSection>

      <AnimatedSection id="isoCertifications" label="ISO certifications" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement
              id="iso-heading"
              type="heading"
              label="ISO certifications heading"
              as="h2"
              className="mb-4 text-3xl font-bold text-gray-900"
            >
              <E path={["isoIntro", "title"]} value={String(isoIntro.title ?? "")} as="span" />
            </AnimatedElement>
            <AnimatedElement
              id="iso-subtitle"
              type="text"
              label="ISO certifications subtitle"
              as="p"
              className="mx-auto max-w-3xl text-lg text-gray-700"
            >
              <E
                path={["isoIntro", "subtitle"]}
                value={String(isoIntro.subtitle ?? "")}
                as="span"
              />
            </AnimatedElement>
          </div>
          {renderCertificateGrid("isoCertifications", isoCertifications, "h-[500px]")}
        </div>
      </AnimatedSection>

      <AnimatedSection id="appreciation" label="Certificate of appreciation" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement
              id="appreciation-title"
              type="heading"
              label="Appreciation certificate heading"
              as="h2"
              className="mb-4 text-3xl font-bold text-gray-900"
            >
              <E
                path={["appreciation", "title"]}
                value={String(appreciation.title ?? "")}
                as="span"
              />
            </AnimatedElement>
            <AnimatedElement
              id="appreciation-description"
              type="text"
              label="Appreciation certificate description"
              as="p"
              className="mx-auto max-w-2xl text-lg text-gray-700"
            >
              <E
                path={["appreciation", "description"]}
                value={String(appreciation.description ?? "")}
                as="span"
              />
            </AnimatedElement>
          </div>
          <div className="flex justify-center">
            <AnimatedElement
              id="appreciation-image"
              type="image"
              label="Appreciation certificate image"
              className="relative h-[400px] w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 shadow-lg"
            >
              <EImg
                path={["appreciation", "image"]}
                image={appreciation.image as any}
                className="h-full w-full object-contain p-4"
              />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="safety" label="Safety standards" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row-reverse">
            <div className="md:w-1/2">
              <AnimatedElement
                id="safety-title"
                type="heading"
                label="Safety standards heading"
                as="h2"
                className="mb-6 text-3xl font-bold text-gray-900"
              >
                <E path={["safety", "title"]} value={String(safety.title ?? "")} as="span" />
              </AnimatedElement>
              {(Array.isArray(safety.paragraphs) ? (safety.paragraphs as string[]) : []).map(
                (text, index, paragraphs) => (
                  <AnimatedElement
                    key={index}
                    id={`safety-paragraph-${index}`}
                    type="text"
                    label={`Safety paragraph ${index + 1}`}
                    staggerIndex={index}
                    as="p"
                    className={
                      index < paragraphs.length - 1
                        ? "mb-4 text-lg text-gray-700"
                        : "text-lg text-gray-700"
                    }
                  >
                    <E path={["safety", "paragraphs", index]} value={text} as="span" />
                  </AnimatedElement>
                ),
              )}
            </div>
            <AnimatedElement
              id="safety-image"
              type="image"
              label="Safety standards image"
              className="relative h-[400px] w-full overflow-hidden rounded-lg shadow-xl md:w-1/2"
            >
              <EImg
                path={["safety", "image"]}
                image={safety.image as any}
                className="h-full w-full object-cover"
              />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="benefits" label="Certification benefits" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <AnimatedElement
              id="benefits-heading"
              type="heading"
              label="Certification benefits heading"
              as="h2"
              className="mb-4 text-3xl font-bold text-gray-900"
            >
              <E
                path={["benefitsIntro", "title"]}
                value={String(benefitsIntro.title ?? "")}
                as="span"
              />
            </AnimatedElement>
            <AnimatedElement
              id="benefits-subtitle"
              type="text"
              label="Certification benefits subtitle"
              as="p"
              className="mx-auto max-w-3xl text-lg text-gray-700"
            >
              <E
                path={["benefitsIntro", "subtitle"]}
                value={String(benefitsIntro.subtitle ?? "")}
                as="span"
              />
            </AnimatedElement>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits
              .filter((benefit) => benefit.visible !== false || editActive)
              .map((benefit, index) => {
                const itemId = String(benefit.id ?? `benefit-${index}`);
                return (
                  <AnimatedElement
                    key={itemId}
                    id={itemId}
                    type="card"
                    label={String(benefit.title ?? `Benefit ${index + 1}`)}
                    sectionId="benefits"
                    staggerIndex={index}
                    className="rounded-lg border border-gray-200 p-6"
                  >
                    <div className="mb-4 flex items-center">
                      <EditableIcon
                        path={["benefits", index, "icon"]}
                        value={benefit.icon}
                        fallback="CheckCircle"
                        className="mr-3 h-6 w-6 text-green-700"
                      />
                      <h3 className="text-xl font-bold text-gray-900">
                        <E
                          path={["benefits", index, "title"]}
                          value={String(benefit.title ?? "")}
                          as="span"
                        />
                      </h3>
                    </div>
                    <p className="text-gray-700">
                      <E
                        path={["benefits", index, "description"]}
                        value={String(benefit.description ?? "")}
                        as="span"
                      />
                    </p>
                  </AnimatedElement>
                );
              })}
          </div>
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
