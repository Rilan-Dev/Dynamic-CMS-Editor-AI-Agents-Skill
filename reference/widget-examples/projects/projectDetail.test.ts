import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { JsonObject } from "@/components/cms/json";
import { defaultProjectIndex } from "@/content/projectDefaults";
import { buildProject, relatedProjects, type Project } from "./projectModel";
import {
  factRows,
  galleryItems,
  projectJsonLd,
  resolveProjectServices,
  serviceChoices,
} from "./projectDetail";

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const route = read("app/projects/[slug]/page.tsx");
const page = read("components/pages/ProjectDetailPage.tsx");
const facts = read("components/projects/ProjectFacts.tsx");
const gallery = read("components/projects/ProjectGallery.tsx");
const statusControl = read("components/projects/ProjectStatusControl.tsx");
const cta = read("components/projects/ProjectCta.tsx");

const services: JsonObject = {
  services: [
    {
      id: "svc-fitout",
      slug: "fit-out",
      title: "Fit-Out",
      children: [
        { id: "svc-joinery", slug: "joinery", title: "Joinery" },
        { id: "svc-hidden-child", slug: "ceilings", title: "Ceilings", visible: false },
      ],
    },
    { id: "svc-mep", slug: "mep", title: "MEP Works" },
    {
      id: "svc-old",
      slug: "legacy",
      title: "Legacy",
      visible: false,
      children: [{ id: "svc-orphan", slug: "orphan", title: "Orphan" }],
    },
  ],
};

const project = (slug: string, overrides: JsonObject = {}): Project =>
  buildProject(`project-${slug}`, {
    title: slug,
    category: "commercial",
    status: "published",
    ...overrides,
  }) as Project;

describe("project detail route", () => {
  it("404s an unpublished project for anyone without a CMS session", () => {
    expect(route).toContain("hasCmsSessionCookie(");
    expect(route).toMatch(/project\.status !== "published" && !editor\) notFound\(\)/);
  });

  it("serves a draft-only project to a signed-in editor", () => {
    expect(route).toContain("if (!editor) return null;");
    expect(route).toContain("getEntry(documentName)");
    expect(route).toContain("normalizeCmsDocument(documentName, entry.draft)");
  });

  it("loads the project, index, siblings and service catalogue in parallel", () => {
    expect(route).toContain("Promise.all(");
    expect(route).toContain('getPageContent("projects", CONTENT_REGISTRY.projects)');
    expect(route).toContain('getPageContent("services", CONTENT_REGISTRY.services)');
    expect(route).toContain('listPublishedByPrefix("project-")');
  });

  it("disables public detail-page metadata during temporary listing mode", () => {
    expect(route).toContain("generateMetadata");
    expect(route).toContain("Temporary listing mode: individual detail pages are not indexed.");
    expect(route).toMatch(/generateMetadata\(\): Promise<Metadata>\s*\{[\s\S]*?return \{\};/);
    expect(route).toContain("if (!editor && projectsIndex.detailPagesEnabled !== true) notFound();");
    expect(route).not.toContain("if (!editor) notFound();");
    expect(route).not.toContain("canonical: `/projects/${slug}`");
    expect(route).not.toContain("project.seo.title");
    expect(route).not.toContain("project.seo.description");
  });
});

describe("contract value", () => {
  const labels = defaultProjectIndex().detail as JsonObject;
  const base = buildProject("project-tower", {
    title: "Tower",
    facts: { client: "A client", value: "AED 12M", valueVisible: false, area: "" },
  }) as Project;

  it("is hidden from visitors unless valueVisible is true", () => {
    const keys = factRows(base.facts, labels, false).map((row) => row.key);
    expect(keys).not.toContain("value");
    const shown = factRows({ ...base.facts, valueVisible: true }, labels, false);
    expect(shown.find((row) => row.key === "value")?.value).toBe("AED 12M");
  });

  it("omits empty rows for visitors but keeps every row for an editor", () => {
    const keys = factRows(base.facts, labels, false).map((row) => row.key);
    expect(keys).toContain("client");
    expect(keys).not.toContain("area");
    const editorKeys = factRows(base.facts, labels, true).map((row) => row.key);
    expect(editorKeys).toEqual(
      expect.arrayContaining(["client", "consultant", "value", "area", "duration"]),
    );
  });

  it("gives the editor a show/hide toggle bound to facts.valueVisible", () => {
    expect(facts).toContain('["facts", "valueVisible"]');
    expect(facts).toContain("useCmsEditing");
  });
});

describe("services used", () => {
  it("resolves parent and child hrefs through the service catalogue", () => {
    expect(resolveProjectServices(["mep", "joinery"], services)).toEqual([
      { slug: "mep", title: "MEP Works", href: "/services/mep" },
      { slug: "joinery", title: "Joinery", href: "/services/fit-out/joinery" },
    ]);
  });

  it("drops references that are unknown or hidden", () => {
    expect(resolveProjectServices(["gone", "ceilings", "orphan"], services)).toEqual([]);
  });

  it("offers only visible, not-yet-chosen services from the catalogue", () => {
    const groups = serviceChoices(services, ["joinery"]);
    expect(groups.map((group) => group.title)).toEqual(["Fit-Out", "MEP Works"]);
    expect(groups[0].options.map((option) => option.slug)).toEqual(["fit-out"]);
    expect(groups[1].options.map((option) => option.slug)).toEqual(["mep"]);
  });

  it("never lets an editor type a free-text service", () => {
    expect(page).toContain("serviceChoices(");
    expect(page).toContain("<select");
    expect(page).toContain('["serviceRefs"]');
  });
});

describe("related projects", () => {
  it("excludes the current project", () => {
    const current = project("alpha");
    const related = relatedProjects(current, [current, project("beta"), project("gamma")], 3);
    expect(related.map((entry) => entry.slug)).toEqual(["beta", "gamma"]);
    expect(page).toContain("relatedProjects(");
    expect(page).toContain("<ProjectCard");
  });
});

describe("gallery", () => {
  it("renders nothing for visitors when empty or fully hidden", () => {
    expect(galleryItems([], false)).toEqual([]);
    expect(galleryItems([{ id: "a", src: "/a.jpg", visible: false }], false)).toEqual([]);
    expect(gallery).toMatch(/if \(!items\.length && !editActive\) return null;/);
  });

  it("keeps each item's document index so edits land on the right entry", () => {
    const items = galleryItems(
      [
        { id: "a", src: "/a.jpg", visible: false },
        { id: "b", src: "/b.jpg", alt: "Lobby" },
      ],
      false,
    );
    expect(items).toEqual([{ id: "b", src: "/b.jpg", alt: "Lobby", index: 1 }]);
  });

  it("lets an editor add and remove images", () => {
    expect(gallery).toContain("<EAdd");
    expect(gallery).toContain("<ERemove");
    expect(gallery).toContain("<EImg");
  });
});

describe("project detail page", () => {
  it("reuses the blog block renderer for the scope", () => {
    expect(page).toContain("<BlogBody");
    expect(page).toContain('basePath={["scope"]}');
  });

  it("composes every band in order", () => {
    const order = [
      'id="projectHero"',
      "<ProjectFacts",
      "<BlogBody",
      "<ProjectGallery",
      'id="projectServices"',
      'id="projectRelated"',
      "<ProjectCta",
    ];
    const positions = order.map((token) => page.indexOf(token));
    positions.forEach((position, index) => expect(position, order[index]).toBeGreaterThan(-1));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("binds the index-owned CTA and labels to the projects document", () => {
    expect(page).toContain('const INDEX = "doc:projects" as const;');
    expect(page).toMatch(/<ProjectCta[^>]*scope=\{INDEX\}/);
    expect(cta).toContain('scope = "page"');
    expect(cta).not.toContain("editable?: boolean");
    for (const path of [
      '["detail", "breadcrumbLabel"]',
      '["detail", "overviewEyebrow"]',
      '["detail", "servicesTitle"]',
      '["related", "title"]',
      '["related", "viewAllLabel"]',
    ]) {
      expect(page).toContain(path);
    }
    expect(page).toContain("<E scope={INDEX}");
    expect(facts).toContain('const INDEX = "doc:projects" as const;');
    expect(facts).toContain('path={["detail", "factsTitle"]}');
    expect(facts).toContain('path={["detail", row.labelField]}');
    expect(gallery).toContain('scope="doc:projects"');
    expect(gallery).toContain('path={["detail", "galleryTitle"]}');
  });

  it("has an editor-only status toggle", () => {
    expect(page).toContain("<ProjectStatusControl");
    expect(statusControl).toContain('setPath(["status"]');
    expect(statusControl).toContain("if (!editing || !ready) return null;");
  });
});

describe("index labels", () => {
  it("ships every label the listing and detail pages read", () => {
    const index = defaultProjectIndex();
    const featured = index.featured as JsonObject;
    const recent = index.recent as JsonObject;
    expect(featured.locationLabel).toBe("Location");
    expect(featured.areaLabel).toBe("Area");
    expect(featured.completionLabel).toBe("Completion");
    expect(recent.viewAllLabel).toBe("View All Projects");
    expect(recent.cardLinkLabel).toBe("View Details");
    expect(recent.loadMoreLabel).toBe("Load More Projects");
    expect(index.detailPagesEnabled).toBe(false);
    expect((index.empty as JsonObject).noMatch).toBe("No projects match this filter yet.");
    expect(index.detail).toBeTruthy();
  });
});

describe("structured data", () => {
  const site = { url: "https://www.example.test", name: "SMTS Contracting LLC" };
  const tower = buildProject("project-tower", {
    title: "Tower",
    summary: "A fit-out.",
    hero: "/images/tower.jpg",
    status: "published",
    facts: {
      client: "Secret Client",
      value: "AED 12M",
      valueVisible: true,
      location: "Dubai, UAE",
      completedOn: "2025-03",
    },
  }) as Project;

  it("is emitted only for a published project, escaped like the blog's", () => {
    expect(route).toMatch(/project\.status === "published" && \(\s*<script\s+type="application\/ld\+json"/);
    expect(route).toContain(String.raw`.replace(/</g, "\\u003c")`);
  });

  it("describes the work without client or contract value", () => {
    const data = projectJsonLd(tower, site);
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: "Tower",
      description: "A fit-out.",
      url: "https://www.example.test/projects/tower",
      creator: { "@type": "Organization", name: "SMTS Contracting LLC", url: site.url },
      image: "https://www.example.test/images/tower.jpg",
      locationCreated: { "@type": "Place", name: "Dubai, UAE" },
      dateCreated: "2025-03",
    });
    const json = JSON.stringify(data);
    expect(json).not.toContain("Secret Client");
    expect(json).not.toContain("AED 12M");
    expect(json).not.toMatch(/"(client|value)"/);
  });

  it("omits the image, place and date when they are absent or not a date", () => {
    const bare = projectJsonLd(
      { ...tower, hero: { src: "/x.jpg" }, facts: { ...tower.facts, location: "", completedOn: "Spring 2025" } },
      site,
    );
    expect(bare).not.toHaveProperty("image");
    expect(bare).not.toHaveProperty("locationCreated");
    expect(bare).not.toHaveProperty("dateCreated");
  });
});
