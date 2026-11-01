import { describe, expect, it } from "vitest";
import {
  buildProject,
  buildProjectIndex,
  filterProjects,
  hasHeroImage,
  projectHref,
  projectsForService,
  publicProject,
  publicProjectDocument,
  relatedProjects,
  toProjectCardView,
  type Project,
} from "./projectModel";
import type { JsonObject } from "@/components/cms/json";
import { defaultProject, defaultProjectIndex } from "@/content/projectDefaults";

const make = (slug: string, overrides: Record<string, unknown> = {}): Project =>
  buildProject(`project-${slug}`, {
    ...defaultProject({ title: slug, slug, category: "commercial" }),
    status: "published",
    ...overrides,
  } as JsonObject)!;

describe("buildProject", () => {
  it("returns null for a document that is not a project", () => {
    expect(buildProject("blog-x", { title: "x" })).toBeNull();
    expect(buildProject("projects", { title: "x" })).toBeNull();
  });

  it("reads identity, href and status", () => {
    const project = make("villa-12");
    expect(project.slug).toBe("villa-12");
    expect(project.href).toBe(projectHref("villa-12"));
    expect(project.href).toBe("/projects/villa-12");
    expect(project.status).toBe("published");
  });

  it("treats anything but 'published' as a draft", () => {
    expect(make("a", { status: "live" }).status).toBe("draft");
  });

  it("drops hidden gallery images and service references", () => {
    const project = make("a", {
      gallery: [
        { id: "g1", src: "/one.jpg", alt: "One", visible: true },
        { id: "g2", src: "/two.jpg", alt: "Two", visible: false },
      ],
      serviceRefs: [
        { id: "r1", slug: "steel-structure-fabrication", visible: true },
        { id: "r2", slug: "plumbing-works", visible: false },
        { id: "r3", slug: "" },
      ],
    });
    expect(project.gallery.map((image) => image.id)).toEqual(["g1"]);
    expect(project.serviceRefs).toEqual(["steel-structure-fabrication"]);
  });

  it("keeps contract value hidden unless explicitly shown", () => {
    expect(make("a").facts.valueVisible).toBe(false);
    expect(make("b", { facts: { value: "AED 1M", valueVisible: true } }).facts.valueVisible).toBe(true);
  });

  it("keeps only scope blocks of a known type", () => {
    const project = make("a", {
      scope: [
        { type: "paragraph", text: "ok" },
        { type: "marquee", text: "no" },
      ],
    });
    expect(project.scope.map((block) => block.type)).toEqual(["paragraph"]);
  });

  it("falls back to title and summary for SEO", () => {
    const project = make("a", { title: "Villa", summary: "A villa." });
    expect(project.seo).toEqual({ title: "Villa", description: "A villa." });
  });
});

describe("publicProject", () => {
  it("blanks the contract value when it is hidden", () => {
    const project = make("a", { facts: { value: "AED 4,200,000", valueVisible: false } });
    expect(publicProject(project).facts.value).toBe("");
    // Nothing else about the project changes.
    expect(publicProject(project).title).toBe(project.title);
  });

  it("keeps the contract value when the editor has shown it", () => {
    const project = make("b", { facts: { value: "AED 1M", valueVisible: true } });
    expect(publicProject(project).facts.value).toBe("AED 1M");
  });
});

describe("publicProjectDocument", () => {
  it("blanks facts.value in the raw document when it is hidden", () => {
    const document = {
      ...defaultProject({ title: "a", slug: "a", category: "commercial" }),
      facts: { value: "AED 4,200,000", valueVisible: false },
    } as JsonObject;
    const redacted = publicProjectDocument(document) as JsonObject;
    expect((redacted.facts as JsonObject).value).toBe("");
  });

  it("keeps facts.value when the editor has shown it", () => {
    const document = {
      ...defaultProject({ title: "a", slug: "a", category: "commercial" }),
      facts: { value: "AED 1M", valueVisible: true },
    } as JsonObject;
    const redacted = publicProjectDocument(document) as JsonObject;
    expect((redacted.facts as JsonObject).value).toBe("AED 1M");
  });

  it("passes through a document with no facts object at all", () => {
    expect(publicProjectDocument({ title: "a" })).toEqual({ title: "a" });
  });
});

describe("toProjectCardView", () => {
  it("keeps only what a card renders", () => {
    const project = make("a", {
      facts: {
        client: "Sample Logistics Client",
        consultant: "Some Consultant",
        value: "AED 4,200,000",
        valueVisible: false,
        location: "Jebel Ali",
        area: "12,000 sq ft",
        completedOn: "2026-03",
      },
      serviceRefs: [{ slug: "building-contracting", visible: true }],
      seo: { title: "SEO title", description: "SEO description" },
      scope: [{ type: "paragraph", text: "internal scope" }],
    });
    const card = toProjectCardView(project);

    expect(card).toEqual({
      slug: "a",
      href: "/projects/a",
      title: "a",
      summary: project.summary,
      category: "commercial",
      hero: project.hero,
      status: "published",
      featured: false,
      serviceRefs: ["building-contracting"],
      facts: {
        location: "Jebel Ali",
        area: "12,000 sq ft",
        completedOn: "2026-03",
        client: "Sample Logistics Client",
        consultant: "Some Consultant",
        duration: "",
        projectStatus: "",
        value: "",
      },
      gallery: [],
      scope: [{ type: "paragraph", text: "internal scope" }],
    });
    expect(card).not.toHaveProperty("seo");
    // Confidential values are present only when explicitly marked public.
    expect(card.facts.value).toBe("");
    expect(card.facts.client).toBe("Sample Logistics Client");
    expect(card.facts.consultant).toBe("Some Consultant");
  });
});

describe("hasHeroImage", () => {
  it("treats an empty hero and the default placeholder as no image", () => {
    expect(hasHeroImage("")).toBe(false);
    expect(hasHeroImage("/placeholder.svg")).toBe(false);
  });

  it("treats any other src as a real image", () => {
    expect(hasHeroImage("/images/home_image.jpg")).toBe(true);
  });
});

describe("buildProjectIndex", () => {
  it("reads categories, the featured slug and page size from defaults", () => {
    const index = buildProjectIndex(defaultProjectIndex());
    expect(index.categories.length).toBeGreaterThan(0);
    expect(index.categories.every((category) => category.slug && category.label)).toBe(true);
    expect(index.featuredSlug).toBe("");
    expect(index.projectsPerPage).toBe(9);
  });

  it("ignores hidden categories", () => {
    const index = buildProjectIndex({
      categories: [
        { slug: "commercial", label: "Commercial" },
        { slug: "retail", label: "Retail", visible: false },
      ],
    });
    expect(index.categories.map((category) => category.slug)).toEqual(["commercial"]);
  });
});

describe("filterProjects", () => {
  const projects = [
    make("a", { category: "commercial", serviceRefs: [{ slug: "building-contracting" }] }),
    make("b", { category: "residential", serviceRefs: [{ slug: "villa-construction" }] }),
    make("c", { category: "commercial", serviceRefs: [{ slug: "villa-construction" }] }),
  ];

  it("returns everything with no filter", () => {
    expect(filterProjects(projects, {}).map((p) => p.slug)).toEqual(["a", "b", "c"]);
  });

  it("filters by category and by service, together", () => {
    expect(filterProjects(projects, { category: "commercial" }).map((p) => p.slug)).toEqual(["a", "c"]);
    expect(filterProjects(projects, { service: "villa-construction" }).map((p) => p.slug)).toEqual(["b", "c"]);
    expect(
      filterProjects(projects, { category: "commercial", service: "villa-construction" }).map((p) => p.slug),
    ).toEqual(["c"]);
  });

  it("excludes drafts from every listing", () => {
    const withDraft = [...projects, make("d", { status: "draft" })];
    expect(filterProjects(withDraft, {}).map((p) => p.slug)).not.toContain("d");
  });
});

describe("projectsForService", () => {
  it("returns published projects linked to the service", () => {
    const projects = [
      make("a", { serviceRefs: [{ slug: "plumbing-works" }] }),
      make("b", { serviceRefs: [{ slug: "electrical-works" }] }),
      make("c", { serviceRefs: [{ slug: "plumbing-works" }], status: "draft" }),
    ];
    expect(projectsForService(projects, "plumbing-works").map((p) => p.slug)).toEqual(["a"]);
  });
});

describe("relatedProjects", () => {
  it("ranks shared category and shared services, excludes itself and drafts", () => {
    const current = make("x", { category: "commercial", serviceRefs: [{ slug: "s1" }] });
    const projects = [
      current,
      make("same-both", { category: "commercial", serviceRefs: [{ slug: "s1" }] }),
      make("same-category", { category: "commercial", serviceRefs: [] }),
      make("unrelated", { category: "residential", serviceRefs: [] }),
      make("draft", { category: "commercial", serviceRefs: [{ slug: "s1" }], status: "draft" }),
    ];
    const related = relatedProjects(current, projects, 2).map((p) => p.slug);
    expect(related).toEqual(["same-both", "same-category"]);
  });

  it("fills with other projects when too few are related", () => {
    const current = make("x", { category: "commercial" });
    const projects = [current, make("other", { category: "residential" })];
    expect(relatedProjects(current, projects, 3).map((p) => p.slug)).toEqual(["other"]);
  });
});
