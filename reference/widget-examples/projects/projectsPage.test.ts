import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const route = read("app/projects/page.tsx");
const detailRoute = read("app/projects/[slug]/page.tsx");
const serviceRoute = read("app/services/[slug]/page.tsx");
const serviceChildRoute = read("app/services/[slug]/[child]/page.tsx");
const page = read("components/pages/ProjectsPage.tsx");
const detailPage = read("components/pages/ProjectDetailPage.tsx");
const card = read("components/projects/ProjectCard.tsx");
const filters = read("components/projects/ProjectFilters.tsx");
const featured = read("components/projects/FeaturedProject.tsx");
const stats = read("components/projects/ProjectStats.tsx");
const cta = read("components/projects/ProjectCta.tsx");
const addProject = read("components/projects/AddProjectControl.tsx");
const navbar = read("components/navbar.tsx");
const serviceProjects = read("components/services/detail/ServiceProjects.tsx");

describe("projects route", () => {
  it("reads the index and every published project, degrading on a store error", () => {
    expect(route).toContain('getPageContent("projects", CONTENT_REGISTRY.projects)');
    expect(route).toContain('listPublishedByPrefix("project-").catch(() => [])');
    expect(route).toContain("Promise.all(");
    expect(route).toContain("buildProject(");
  });

  it("resolves the active service filter's real title from the services catalogue", () => {
    expect(route).toContain('getPageContent("services", CONTENT_REGISTRY.services)');
    expect(route).toContain("flattenServiceCatalogue(");
    expect(route).toContain("serviceCatalogue={serviceCatalogue}");
  });

  it("wraps the URL-driven listing in a Suspense boundary", () => {
    expect(route).toContain("<Suspense fallback={null}>");
  });

  it("has canonical metadata", () => {
    expect(route).toContain('title: "Projects"');
    expect(route).toContain('alternates: { canonical: "/projects" }');
  });
});

describe("D1: every route redacts before crossing to the client", () => {
  it("the listing route projects every project down to a card view before handing it to the client page", () => {
    // The failure mode this guards: building `projects` from `buildProject(...)`
    // (which still carries facts.value, client, consultant, seo, scope) and
    // passing that straight into the `projects` prop, unprojected.
    const buildIndex = route.indexOf("buildProject(");
    const projectionIndex = route.indexOf(".map(toProjectCardView)");
    const propIndex = route.indexOf("projects={projects}");
    expect(buildIndex).toBeGreaterThan(-1);
    expect(projectionIndex).toBeGreaterThan(buildIndex);
    expect(propIndex).toBeGreaterThan(projectionIndex);
  });

  it("the detail route redacts the contract value for every non-editor viewer, in both the project and the raw document", () => {
    expect(detailRoute).toContain("publicProject(");
    expect(detailRoute).toContain("publicProjectDocument(");
    expect(detailRoute).toContain("editor ? project : publicProject(project)");
    expect(detailRoute).toContain(
      "editor ? resolved.document : publicProjectDocument(resolved.document)",
    );
  });

  it("the detail route always sends sibling projects as card views, never full projects", () => {
    expect(detailRoute).toContain("resolved.projects.map(toProjectCardView)");
  });

  it("both service routes project their linked projects down to card views", () => {
    expect(serviceRoute).toContain("projectsForService(projects, slug).map(toProjectCardView)");
    expect(serviceChildRoute).toContain(
      "projectsForService(projects, childSlug).map(toProjectCardView)",
    );
  });

  it("the listing page and detail page type their project props as card views, not full projects", () => {
    expect(page).toContain("projects: ProjectCardView[]");
    expect(detailPage).toContain("projects: ProjectCardView[]");
  });
});

describe("projects listing page", () => {
  it("drives category and service filters from the URL", () => {
    expect(page).toContain("useSearchParams");
    expect(page).toContain('searchParams?.get("category")');
    expect(page).toContain('searchParams?.get("service")');
    expect(page).toContain("filterProjects(");
  });

  it("renders the editable empty state instead of an empty grid", () => {
    expect(page).toContain('path={["empty", "title"]}');
    expect(page).toContain('path={["empty", "body"]}');
    expect(page).toMatch(/published\.length === 0|!published\.length/);
    expect(page).toContain("results.length > 0");
  });

  it("keeps hero copy and image editable", () => {
    expect(page).toContain('path={["hero", "eyebrow"]}');
    expect(page).toContain('path={["hero", "title"]}');
    expect(page).toContain('path={["hero", "subtitle"]}');
    expect(page).toContain('path={["hero", "image"]}');
  });

  it("composes every band in the reference order", () => {
    const order = ["<ProjectFilters", "<FeaturedProject", "<ProjectCard", "<ProjectStats", "<ProjectCta"];
    const positions = order.map((token) => page.indexOf(token));
    for (const [index, position] of positions.entries()) {
      expect(position, order[index]).toBeGreaterThan(-1);
    }
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("loads unpublished roster projects only through the authenticated API while editing", () => {
    expect(page).toContain("CmsService.getEntry(");
    expect(page).toContain("if (!showDrafts) return");
  });

  it("offers the add-project control", () => {
    expect(page).toContain("<AddProjectControl");
  });

  it("resolves the service filter chip's label from the catalogue, falling back to the humanized slug", () => {
    expect(page).toContain("serviceCatalogue.find((entry) => entry.slug === service)?.title");
    expect(page).toContain("humanizeSlug(service)");
    expect(page).toContain("activeServiceLabel={serviceLabel}");
  });

  it("omits the bare recent-projects heading when the unfiltered grid is empty only because the featured project consumed it", () => {
    expect(page).toContain(": !filtered && results.length === 0 ? null : (");
  });

  it("D2: fades the hero image with a mask instead of a coloured overlay, so it blends into whatever backdrop is behind it", () => {
    expect(page).toMatch(/\[mask-image:linear-gradient\(/);
    expect(page).toMatch(/\[-webkit-mask-image:linear-gradient\(/);
    // The old flat-colour overlay produced a visible seam against the
    // section's diagonal `from-brand-soft` backdrop; it must be gone.
    expect(page).not.toContain("bg-gradient-to-b from-background via-background/10 to-transparent");
  });

  it("D3: skips the whole project-list section for visitors when the only published project is the featured one, but keeps it for editors", () => {
    expect(page).toContain("skipEmptyListSection");
    expect(page).toMatch(/const skipEmptyListSection =\s*\n?\s*!showDrafts/);
    expect(page).toContain("{!skipEmptyListSection && (");
  });

  it("D8: the filtered no-match message no longer duplicates the header's View All Projects link", () => {
    const noMatchBlock = page.slice(
      page.indexOf(") : filtered ? ("),
      page.indexOf(") : null}", page.indexOf(") : filtered ? (")),
    );
    expect(noMatchBlock).not.toContain("<Link");
  });
});

describe("filter pills", () => {
  it("link with ?category= and mark the active pill", () => {
    expect(filters).toContain('params.set("category"');
    expect(filters).toContain("<Link");
    expect(filters).toContain("aria-current");
  });

  it("shows the resolved service title on the active-service chip, falling back to the humanized slug", () => {
    expect(filters).toContain("activeServiceLabel?: string");
    expect(filters).toContain("activeServiceLabel || humanizeSlug(activeService)");
  });
});

describe("featured project", () => {
  it("resolves the named project, then the first flagged one", () => {
    expect(featured).toContain("featuredSlug");
    expect(featured).toContain("project.featured");
  });

  it("omits empty meta items", () => {
    expect(featured).toContain(".filter((item) => item.value)");
  });

  it("D4: no longer points editors at a nonexistent per-project featured toggle", () => {
    expect(featured).toContain("Pick a published project above.");
    expect(featured).not.toContain("mark one as featured on its page");
  });

  it("D6: renders a themed fallback instead of the raw placeholder image", () => {
    expect(featured).toContain("hasHeroImage(");
    expect(featured).toContain("Building2");
    expect(featured).toContain("bg-muted");
  });
});

describe("project card", () => {
  it("is a whole-card link with a category chip and a location pin", () => {
    expect(card).toContain("<Link");
    expect(card).toMatch(/bg-brand-soft[^"]*text-brand-strong/);
    expect(card).toContain("MapPin");
    expect(card).toContain("export function ProjectCard");
  });

  it("D6: renders a themed fallback instead of the raw placeholder image", () => {
    expect(card).toContain("hasHeroImage(");
    expect(card).toContain("Building2");
    expect(card).toContain("bg-muted");
  });
});

describe("project detail page (D6)", () => {
  it("renders a themed fallback hero instead of the raw placeholder image for visitors", () => {
    expect(detailPage).toContain("hasHeroImage(");
    expect(detailPage).toContain("Building2");
    expect(detailPage).toContain("showHeroImage");
  });
});

describe("navbar active state (D5)", () => {
  it("marks a link active on its own route and on any nested route", () => {
    expect(navbar).toContain(
      'pathname === href || (href !== "/" && !!pathname && pathname.startsWith(`${href}/`))',
    );
  });
});

describe("service page projects band (D8)", () => {
  it("makes the View All Projects label CMS-editable instead of hard-coded", () => {
    expect(serviceProjects).toContain('path={[...basePath, "viewAllLabel"]}');
    expect(serviceProjects).toContain('|| "View All Projects"');
    expect(serviceProjects).not.toMatch(/>\s*View All Projects\s*<ArrowRight/);
  });
});

describe("project stats", () => {
  it("renders only visible items and nothing for visitors when none are", () => {
    expect(stats).toContain("item.visible !== false");
    expect(stats).toContain("if (!shown.length && !editActive) return null");
  });
});

describe("project CTA", () => {
  it("is a dark band with a fixed-dark scrim and an outline button that inverts", () => {
    expect(cta).toContain("export function ProjectCta");
    expect(cta).toContain("bg-inverse");
    expect(cta).toContain("text-inverse-foreground");
    expect(cta).toContain("hover:bg-inverse-foreground hover:text-inverse");
  });
});

describe("creating a project", () => {
  it("refuses a slug that is already in the roster", () => {
    expect(addProject).toContain("projectSlug(title)");
    expect(addProject).toContain("roster.some((entry) => entry.slug === slug)");
  });

  it("saves the draft document before extending the roster and navigating", () => {
    const save = addProject.indexOf("CmsService.saveDraft(");
    const roster = addProject.indexOf("setPath(indexPath");
    const navigate = addProject.indexOf("router.push(");
    expect(save).toBeGreaterThan(-1);
    expect(addProject).toContain("projectDocumentName(slug)");
    expect(addProject).toContain("defaultProject(");
    expect(save).toBeLessThan(roster);
    expect(roster).toBeLessThan(navigate);
  });
});

describe("no fabricated content", () => {
  const FABRICATED = ["DP World", "Emaar", "Al Futtaim", "Damac", "Emirates Steel"];
  const files = [
    ...(readdirSync("components/projects") as string[])
      .filter((file) => !file.endsWith(".test.ts"))
      .map((file) => join("components/projects", file)),
    ...(readdirSync("components/pages") as string[])
      .filter((file) => file.startsWith("Project"))
      .map((file) => join("components/pages", file)),
    "content/projectDefaults.ts",
  ];

  it("covers the listing page files", () => {
    expect(files).toContain(join("components/pages", "ProjectsPage.tsx"));
  });

  for (const file of files) {
    it(`${file} names no legacy client`, () => {
      const source = readFileSync(file, "utf8");
      for (const name of FABRICATED) expect(source, name).not.toContain(name);
    });
  }
});
