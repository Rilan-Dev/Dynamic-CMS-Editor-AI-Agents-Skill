"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { CareerCulture } from "@/components/careers/CareerCulture";
import { CareerFaq } from "@/components/careers/CareerFaq";
import { CareerFinalCta } from "@/components/careers/CareerFinalCta";
import { CareerHero } from "@/components/careers/CareerHero";
import { CareerValueGrid } from "@/components/careers/CareerValueGrid";
import { GeneralApplication } from "@/components/careers/GeneralApplication";
import { HiringProcess } from "@/components/careers/HiringProcess";
import {
  createBlankCareerJob,
  JobOpeningCard,
} from "@/components/careers/JobOpeningCard";
import { JobFilters } from "@/components/careers/JobFilters";
import {
  careerJobAnchorId,
  deriveCareerFilterOptions,
  filterCareerJobs,
  normalizeCareerJobs,
  type CareerFilters,
} from "@/components/careers/jobCatalog";
import { isValidCareerEmail } from "@/components/careers/careerMailto";
import { E, EAdd } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing, useSection } from "@/components/cms/store";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asObjects = (value: unknown): JsonObject[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is JsonObject =>
          !!entry && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];

function SectionIntro({
  basePath,
  section,
  animationPrefix,
}: {
  basePath: string;
  section: JsonObject;
  animationPrefix: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <AnimatedElement
        id={`${animationPrefix}-eyebrow`}
        type="text"
        label={`${animationPrefix} eyebrow`}
        as="p"
        className="text-sm font-bold uppercase tracking-[0.2em] text-green-700"
      >
        <E
          path={[basePath, "eyebrow"]}
          value={String(section.eyebrow ?? "")}
          as="span"
        />
      </AnimatedElement>
      <AnimatedElement
        id={`${animationPrefix}-title`}
        type="heading"
        label={`${animationPrefix} heading`}
        as="h2"
        className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl"
      >
        <E
          path={[basePath, "title"]}
          value={String(section.title ?? "")}
          as="span"
        />
      </AnimatedElement>
      <AnimatedElement
        id={`${animationPrefix}-description`}
        type="text"
        label={`${animationPrefix} description`}
        as="p"
        className="mt-4 text-lg leading-8 text-gray-700"
      >
        <E
          path={[basePath, "description"]}
          value={String(section.description ?? "")}
          as="span"
          multilineBreaks
        />
      </AnimatedElement>
    </div>
  );
}

export default function CareersPage({ content }: { content: JsonObject }) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const whyJoin = useSection(["whyJoin"], asObject(content.whyJoin));
  const culture = useSection(["culture"], asObject(content.culture));
  const benefits = useSection(["benefits"], asObject(content.benefits));
  const jobsIntro = useSection(["jobsIntro"], asObject(content.jobsIntro));
  const jobs = useSection(["jobs"], asObjects(content.jobs));
  const hiringProcess = useSection(
    ["hiringProcess"],
    asObject(content.hiringProcess),
  );
  const generalApplication = useSection(
    ["generalApplication"],
    asObject(content.generalApplication),
  );
  const faq = useSection(["faq"], asObject(content.faq));
  const finalCta = useSection(["finalCta"], asObject(content.finalCta));
  const applicationEmail = useSection(
    ["applicationEmail"],
    String(content.applicationEmail ?? ""),
  );

  const [filters, setFilters] = useState<CareerFilters>({
    department: "",
    location: "",
    employmentType: "",
    query: "",
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const initializedExpansion = useRef(false);

  const normalizedJobs = useMemo(() => normalizeCareerJobs(jobs), [jobs]);
  const entries = useMemo(
    () =>
      normalizedJobs.map((normalizedJob, index) => ({
        normalizedJob,
        rawJob: jobs[index] ?? {},
        sourceIndex: index,
      })),
    [jobs, normalizedJobs],
  );
  const publicEntries = useMemo(
    () =>
      entries.filter(
        ({ normalizedJob }) =>
          normalizedJob.visible && normalizedJob.status === "open",
      ),
    [entries],
  );
  const filterOptions = useMemo(
    () =>
      deriveCareerFilterOptions(
        publicEntries.map((entry) => entry.normalizedJob),
      ),
    [publicEntries],
  );
  const displayedEntries = useMemo(() => {
    if (editActive) return entries;
    const filtered = new Set(
      filterCareerJobs(
        publicEntries.map((entry) => entry.normalizedJob),
        filters,
      ),
    );
    return publicEntries.filter((entry) => filtered.has(entry.normalizedJob));
  }, [editActive, entries, filters, publicEntries]);

  const displayedIds = useMemo(
    () => new Set(displayedEntries.map((entry) => entry.normalizedJob.id)),
    [displayedEntries],
  );

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(
        [...current].filter((id) => displayedIds.has(id)),
      );
      if (
        next.size === current.size &&
        [...next].every((id) => current.has(id))
      ) {
        return current;
      }
      return next;
    });
  }, [displayedIds]);

  useEffect(() => {
    if (
      editActive ||
      initializedExpansion.current ||
      displayedEntries.length === 0
    ) {
      return;
    }
    initializedExpansion.current = true;
    setExpandedIds(new Set([displayedEntries[0].normalizedJob.id]));
  }, [displayedEntries, editActive]);

  useEffect(() => {
    if (editActive || typeof window === "undefined") return;

    const expandHashTarget = () => {
      const target = window.location.hash.replace(/^#/, "");
      if (!target) return;
      const match = displayedEntries.find(
        (entry) => careerJobAnchorId(entry.normalizedJob.id) === target,
      );
      if (match) {
        initializedExpansion.current = true;
        setExpandedIds(new Set([match.normalizedJob.id]));
      }
    };

    expandHashTarget();
    window.addEventListener("hashchange", expandHashTarget);
    return () => window.removeEventListener("hashchange", expandHashTarget);
  }, [displayedEntries, editActive]);

  const toggleExpanded = (id: string, expanded: boolean) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const whyJoinCards = asObjects(whyJoin.cards);
  const benefitCards = asObjects(benefits.cards);
  const validApplicationEmail = isValidCareerEmail(applicationEmail);

  return (
    <AnimatedPage
      id="careers"
      label="Careers page"
      animations={animations}
      className="flex flex-col overflow-x-hidden"
    >
      <CareerHero hero={hero} />

      <AnimatedSection
        id="why-join"
        label="Why work with SMTS"
        className="bg-white py-16 lg:py-20"
      >
        <div className="container mx-auto px-4 md:px-6">
          <SectionIntro
            basePath="whyJoin"
            section={whyJoin}
            animationPrefix="career-why-join"
          />
          <div className="mt-10">
            <CareerValueGrid
              path={["whyJoin", "cards"]}
              items={whyJoinCards}
              columns="sm:grid-cols-2 lg:grid-cols-3"
              sectionId="why-join"
              itemLabel="career value"
              blankItem={() => ({
                id: createCmsItemId("career-value"),
                icon: "Sparkles",
                title: "New Career Value",
                description: "Add a reason to work with SMTS.",
                visible: true,
              })}
            />
          </div>
        </div>
      </AnimatedSection>

      <CareerCulture culture={culture} />

      <AnimatedSection
        id="benefits"
        label="Employee benefits"
        className="bg-white py-16 lg:py-20"
      >
        <div className="container mx-auto px-4 md:px-6">
          <SectionIntro
            basePath="benefits"
            section={benefits}
            animationPrefix="career-benefits"
          />
          <div className="mt-10">
            <CareerValueGrid
              path={["benefits", "cards"]}
              items={benefitCards}
              columns="sm:grid-cols-2 lg:grid-cols-3"
              sectionId="benefits"
              itemLabel="employee support card"
              blankItem={() => ({
                id: createCmsItemId("career-benefit"),
                icon: "HeartHandshake",
                title: "New Support Item",
                description: "Describe role-dependent employee support.",
                visible: true,
              })}
            />
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection
        id="open-positions"
        label="Open careers positions"
        className="bg-gray-50 py-16 lg:py-20"
      >
        <div className="container mx-auto px-4 md:px-6">
          <SectionIntro
            basePath="jobsIntro"
            section={jobsIntro}
            animationPrefix="career-open-positions"
          />

          <div className="mt-10">
            <JobFilters
              filters={filters}
              options={filterOptions}
              count={editActive ? entries.length : displayedEntries.length}
              labels={{
                search: String(jobsIntro.searchLabel ?? "Search open positions"),
                searchPlaceholder: String(
                  jobsIntro.searchPlaceholder ?? "Search jobs",
                ),
                department: String(jobsIntro.departmentLabel ?? "Department"),
                departmentAll: String(
                  jobsIntro.departmentAllLabel ?? "All departments",
                ),
                location: String(jobsIntro.locationLabel ?? "Location"),
                locationAll: String(
                  jobsIntro.locationAllLabel ?? "All locations",
                ),
                employmentType: String(
                  jobsIntro.employmentTypeLabel ?? "Employment type",
                ),
                employmentTypeAll: String(
                  jobsIntro.employmentTypeAllLabel ?? "All employment types",
                ),
                clearFilters: String(
                  jobsIntro.clearFiltersLabel ?? "Clear filters",
                ),
                resultCount: String(
                  jobsIntro.resultCountLabel ?? "open position",
                ),
              }}
              onChange={setFilters}
            />
          </div>

          {editActive && (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                validApplicationEmail
                  ? "border-amber-300 bg-amber-50"
                  : "border-red-300 bg-red-50"
              }`}
              data-cms-ui
            >
              <span className="mr-2 text-sm font-semibold text-gray-900">
                Applications email:
              </span>
              <E
                path={["applicationEmail"]}
                value={applicationEmail}
                as="span"
                className="text-sm text-gray-900"
              />
              {!validApplicationEmail && (
                <p className="mt-2 text-sm font-semibold text-red-700" role="status">
                  Enter a valid mailbox address before publishing.
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Filters do not hide draft repair records while CMS editing is active.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            {displayedEntries.map(
              ({ normalizedJob, rawJob, sourceIndex }) => (
                <JobOpeningCard
                  key={`${sourceIndex}:${normalizedJob.id}`}
                  rawJob={rawJob}
                  normalizedJob={normalizedJob}
                  index={sourceIndex}
                  count={jobs.length}
                  expanded={expandedIds.has(normalizedJob.id)}
                  onExpandedChange={(expanded) =>
                    toggleExpanded(normalizedJob.id, expanded)
                  }
                  applicationEmail={applicationEmail}
                  allJobs={jobs}
                />
              ),
            )}
          </div>

          {displayedEntries.length === 0 && (
            <div
              aria-live="polite"
              className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center"
            >
              <h3 className="text-xl font-bold text-gray-900">
                <E
                  path={["jobsIntro", "emptyTitle"]}
                  value={String(jobsIntro.emptyTitle ?? "No open positions")}
                  as="span"
                />
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-gray-600">
                <E
                  path={["jobsIntro", "emptyDescription"]}
                  value={String(jobsIntro.emptyDescription ?? "")}
                  as="span"
                  multilineBreaks
                />
              </p>
            </div>
          )}

          {editActive && (
            <div className="mt-8 flex justify-center">
              <EAdd
                label="Add job opening"
                onAdd={() =>
                  setPath(["jobs"], [...jobs, createBlankCareerJob()])
                }
              />
            </div>
          )}
        </div>
      </AnimatedSection>

      <HiringProcess section={hiringProcess} />
      <GeneralApplication
        section={generalApplication}
        applicationEmail={applicationEmail}
      />
      <CareerFaq section={faq} />
      <CareerFinalCta section={finalCta} />
    </AnimatedPage>
  );
}
