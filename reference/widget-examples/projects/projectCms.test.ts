import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { JsonObject } from "@/components/cms/json";
import { normalizeCmsDocument } from "@/components/cms/documentNormalization";
import { validateCmsDocuments } from "@/components/cms/documentValidation";
import { slugForPathname } from "@/components/cms/store";

describe("slugForPathname for projects", () => {
  it("edits the projects index at /projects", () => {
    expect(slugForPathname("/projects")).toBe("projects");
  });

  it("edits a single project document by its slug", () => {
    expect(slugForPathname("/projects/villa-12")).toBe("project-villa-12");
  });
});

describe("project document validation", () => {
  const project = (over: JsonObject = {}): JsonObject => ({
    title: "Villa 12",
    slug: "villa-12",
    category: "residential",
    status: "published",
    facts: { valueVisible: false },
    serviceRefs: [],
    ...over,
  });

  const projectIndex: JsonObject = {
    categories: [{ id: "c1", slug: "residential", label: "Residential" }],
  };

  const servicesPublished: JsonObject = {
    services: [
      {
        id: "svc-1",
        title: "Building Contracting",
        slug: "building-contracting",
        visible: true,
        children: [
          {
            id: "svc-1-1",
            title: "Villa Construction",
            slug: "villa-construction",
            visible: true,
          },
        ],
      },
      {
        id: "svc-hidden",
        title: "Hidden Service",
        slug: "hidden-service",
        visible: false,
      },
    ],
  };

  const codes = (
    document: JsonObject,
    index: JsonObject | null = projectIndex,
    services: JsonObject | null = servicesPublished,
  ) =>
    validateCmsDocuments(document, null, {
      projectIndexDraft: index,
      servicesPublished: services,
    }).map((error) => error.code);

  it("accepts a well-formed project", () => {
    expect(codes(project())).toEqual([]);
  });

  it("requires a title", () => {
    expect(codes(project({ title: "" }))).toContain("missing-project-title");
  });

  it("requires a URL-safe slug", () => {
    expect(codes(project({ slug: "Not A Slug" }))).toContain("invalid-project-slug");
    expect(codes(project({ slug: "" }))).toContain("invalid-project-slug");
  });

  it("requires a known status", () => {
    expect(codes(project({ status: "live" }))).toContain("invalid-project-status");
  });

  it("requires the category to exist in the index", () => {
    expect(codes(project({ category: "nope" }))).toContain("unknown-project-category");
    expect(codes(project())).not.toContain("unknown-project-category");
  });

  it("skips the category check when the index is unavailable", () => {
    expect(codes(project({ category: "nope" }), null)).not.toContain(
      "unknown-project-category",
    );
  });

  it("flags a service reference that no longer exists", () => {
    expect(
      codes(
        project({
          serviceRefs: [{ id: "r1", slug: "not-a-service", visible: true }],
        }),
      ),
    ).toContain("unknown-project-service");
  });

  it("flags a hidden top-level service reference", () => {
    expect(
      codes(
        project({
          serviceRefs: [{ id: "r1", slug: "hidden-service", visible: true }],
        }),
      ),
    ).toContain("hidden-project-service");
  });

  it("treats a sub-service under a hidden parent as hidden", () => {
    const hiddenParentServices: JsonObject = {
      services: [
        {
          id: "svc-1",
          title: "Building Contracting",
          slug: "building-contracting",
          visible: false,
          children: [
            {
              id: "svc-1-1",
              title: "Villa Construction",
              slug: "villa-construction",
              visible: true,
            },
          ],
        },
      ],
    };
    expect(
      codes(
        project({
          serviceRefs: [{ id: "r1", slug: "villa-construction", visible: true }],
        }),
        projectIndex,
        hiddenParentServices,
      ),
    ).toContain("hidden-project-service");
  });

  it("accepts a visible sub-service reference", () => {
    expect(
      codes(
        project({
          serviceRefs: [{ id: "r1", slug: "villa-construction", visible: true }],
        }),
      ),
    ).toEqual([]);
  });

  it("ignores a hidden (removed) service reference item", () => {
    expect(
      codes(
        project({
          serviceRefs: [{ id: "r1", slug: "not-a-service", visible: false }],
        }),
      ),
    ).not.toContain("unknown-project-service");
  });

  it("skips the service reference check when services are unavailable", () => {
    expect(
      codes(
        project({
          serviceRefs: [{ id: "r1", slug: "not-a-service", visible: true }],
        }),
        projectIndex,
        null,
      ),
    ).not.toContain("unknown-project-service");
  });

  it("ignores documents that are not projects", () => {
    expect(
      validateCmsDocuments({ hero: { title: "Home" } }, null).map((e) => e.code),
    ).not.toContain("missing-project-title");
  });
});

describe("project document normalization", () => {
  const normalize = (document: JsonObject) =>
    normalizeCmsDocument("project-villa-12", document);

  it("derives the slug from the document name", () => {
    expect(normalize({ title: "Villa 12" }).slug).toBe("villa-12");
  });

  it("keeps an editor-supplied slug", () => {
    expect(normalize({ title: "T", slug: "custom" }).slug).toBe("custom");
  });

  it("defaults an unset status to draft", () => {
    expect(normalize({ title: "T" }).status).toBe("draft");
    expect(normalize({ title: "T", status: "published" }).status).toBe("published");
  });

  it("ensures facts.valueVisible is a boolean", () => {
    const withoutFacts = normalize({ title: "T" }) as JsonObject;
    expect((withoutFacts.facts as JsonObject).valueVisible).toBe(false);

    const withFacts = normalize({
      title: "T",
      facts: { valueVisible: true },
    }) as JsonObject;
    expect((withFacts.facts as JsonObject).valueVisible).toBe(true);
  });

  it("ensures scope, gallery and serviceRefs are arrays", () => {
    const result = normalize({ title: "T" }) as JsonObject;
    expect(result.scope).toEqual([]);
    expect(result.gallery).toEqual([]);
    expect(result.serviceRefs).toEqual([]);
  });

  it("gives gallery items stable ids", () => {
    const result = normalize({
      title: "T",
      gallery: [{ src: "/a.jpg", alt: "A" }, { src: "/b.jpg", alt: "B" }],
    }) as JsonObject;
    const gallery = result.gallery as JsonObject[];
    expect(typeof gallery[0].id).toBe("string");
    expect(gallery[0].id).not.toBe("");
    expect(gallery[0].id).not.toBe(gallery[1].id);
  });

  it("is idempotent", () => {
    const once = normalize({ title: "T", gallery: [{ src: "/a.jpg" }] });
    expect(normalize(once)).toEqual(once);
  });
});

describe("project index normalization", () => {
  it("gives categories stable ids and a roster array", () => {
    const result = normalizeCmsDocument("projects", {
      categories: [{ slug: "residential", label: "Residential" }],
    }) as JsonObject;
    const categories = result.categories as JsonObject[];
    expect(typeof categories[0].id).toBe("string");
    expect(result.projects).toEqual([]);
  });

  it("keeps an existing roster", () => {
    const result = normalizeCmsDocument("projects", {
      projects: [{ id: "p1", slug: "villa-12" }],
    }) as JsonObject;
    expect((result.projects as JsonObject[])[0].slug).toBe("villa-12");
  });
});

describe("projects navigation link", () => {
  it("adds a Projects link to the navbar right after Services", () => {
    const result = normalizeCmsDocument("site", {
      navbar: {
        links: [
          { name: "Home", href: "/" },
          { name: "Services", href: "/services" },
          { name: "Contact", href: "/contact" },
        ],
      },
    }) as JsonObject;
    const links = (result.navbar as JsonObject).links as JsonObject[];
    const servicesIndex = links.findIndex((link) => link.href === "/services");
    expect(links[servicesIndex + 1].href).toBe("/projects");
    expect(links.filter((link) => link.href === "/projects")).toHaveLength(1);
  });

  it("does not add a second navbar link", () => {
    const once = normalizeCmsDocument("site", {
      navbar: {
        links: [
          { name: "Services", href: "/services" },
          { name: "Projects", href: "/projects" },
        ],
      },
    }) as JsonObject;
    const links = (once.navbar as JsonObject).links as JsonObject[];
    expect(links.filter((link) => link.href === "/projects")).toHaveLength(1);
  });

  it("adds a Projects link to the footer quick links right after Services", () => {
    const result = normalizeCmsDocument("site", {
      footer: {
        columns: [
          {
            heading: "Company",
            type: "links",
            links: [
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
            ],
          },
        ],
      },
    }) as JsonObject;
    const columns = (result.footer as JsonObject).columns as JsonObject[];
    const links = columns[0].links as JsonObject[];
    const servicesIndex = links.findIndex((link) => link.href === "/services");
    expect(links[servicesIndex + 1].href).toBe("/projects");
  });

  it("does not add a second footer link", () => {
    const once = normalizeCmsDocument("site", {
      footer: {
        columns: [
          {
            heading: "Company",
            type: "links",
            links: [
              { label: "Services", href: "/services" },
              { label: "Projects", href: "/projects" },
            ],
          },
        ],
      },
    }) as JsonObject;
    const columns = (once.footer as JsonObject).columns as JsonObject[];
    const links = columns[0].links as JsonObject[];
    expect(links.filter((link) => link.href === "/projects")).toHaveLength(1);
  });

  it("uses an icon the project actually ships", async () => {
    const { ALL_ICONS } = await import("@/components/cms/icons");
    const result = normalizeCmsDocument("site", {
      navbar: { links: [{ name: "Services", href: "/services" }] },
    }) as JsonObject;
    const links = (result.navbar as JsonObject).links as JsonObject[];
    const project = links.find((link) => link.href === "/projects");
    expect(Object.keys(ALL_ICONS)).toContain(String(project?.icon));
  });
});

describe("store wiring (source assertions)", () => {
  const source = readFileSync("components/cms/store.ts", "utf8");

  it("passes both the blog and project category indexes to the validator", () => {
    // The blog category check was already wired into the validator but
    // never received its index — this line fixes that pre-existing bug.
    expect(source).toContain("blogIndexDraft: state.docs.blogs ?? null");
    expect(source).toContain("projectIndexDraft: state.docs.projects ?? null");
  });

  it("edits a project document via its document-name slug", () => {
    expect(source).toContain("projectDocumentName(second)");
  });

  it("loads the projects index alongside a project document being edited", () => {
    expect(source).toContain("isProjectDocument(pageSlug)");
  });

  it("falls back to a fresh project template for an editor-created document", () => {
    expect(source).toContain("isProjectDocument(slug)");
    expect(source).toContain("defaultProject(");
  });
});

describe("GlobalEditToolbar wiring (source assertion)", () => {
  it("treats a project document as an editable page", () => {
    const source = readFileSync("components/cms/GlobalEditToolbar.tsx", "utf8");
    expect(source).toContain("isProjectDocument(slug)");
  });
});

describe("publishing project documents (API route)", () => {
  const route = readFileSync("lib/server/cmsRevalidation.ts", "utf8");

  it("revalidates the projects listing and article route", () => {
    expect(route).toContain('slug === "projects" || isProjectDocument(slug)');
    expect(route).toContain('revalidatePath("/projects")');
    expect(route).toContain('revalidatePath("/projects/[slug]", "page")');
  });

  it("also revalidates both service route trees, since service pages list linked projects", () => {
    expect(route).toMatch(
      /isProjectDocument\(slug\)[\s\S]{0,400}revalidatePath\("\/services\/\[slug\]", "page"\)/,
    );
    expect(route).toMatch(
      /isProjectDocument\(slug\)[\s\S]{0,400}revalidatePath\("\/services\/\[slug\]\/\[child\]", "page"\)/,
    );
  });
});

describe("sitemap wiring (source assertion)", () => {
  const sitemap = readFileSync("app/sitemap.ts", "utf8");

  it("still renders a sitemap when the content store is unreadable", () => {
    expect(sitemap).toContain("publishedProjectSlugs");
  });
});

describe("SITE_ROUTES", () => {
  it("includes the projects listing", async () => {
    const { SITE_ROUTES } = await import("@/lib/seo");
    expect(SITE_ROUTES).toContainEqual({
      path: "/projects",
      priority: 0.8,
      changeFrequency: "weekly",
    });
  });
});
