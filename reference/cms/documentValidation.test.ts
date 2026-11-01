import { describe, expect, it } from "vitest";
import type { JsonObject } from "./json";
import { isSafeCmsUrl, validateCmsDocuments } from "./documentValidation";

describe("isSafeCmsUrl", () => {
  it.each([
    "/about",
    "#services",
    "mailto:info@example.com",
    "tel:+971500000000",
    "https://example.com/path",
    "http://localhost:3000/preview",
  ])("accepts %s", (value) => {
    expect(isSafeCmsUrl(value)).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,bad", "ftp://example.com/file"])(
    "rejects %s",
    (value) => {
      expect(isSafeCmsUrl(value)).toBe(false);
    },
  );
});

describe("validateCmsDocuments", () => {
  it("reports unsafe links, duplicate IDs, and invalid animation ranges", () => {
    const page = {
      animations: {
        page: {
          preset: "unknown-motion",
          timing: { durationMs: -1, delayMs: 50001 },
          viewport: { threshold: 2 },
        },
      },
    } as JsonObject;
    const site = {
      navbar: {
        links: [
          { id: "same", name: "One", href: "javascript:alert(1)" },
          { id: "same", name: "Two", href: "/two" },
        ],
      },
    } as JsonObject;

    const codes = validateCmsDocuments(page, site).map((error) => error.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "unsafe-url",
        "duplicate-id",
        "invalid-duration",
        "invalid-delay",
        "invalid-threshold",
        "unknown-preset",
      ]),
    );
  });

  it("accepts valid page and site documents", () => {
    const errors = validateCmsDocuments(
      {
        animations: {
          page: {
            mode: "override",
            preset: "fade-up",
            timing: { durationMs: 600, delayMs: 50 },
            viewport: { threshold: 0.25 },
          },
        },
      } as JsonObject,
      {
        navbar: { links: [{ id: "home", name: "Home", href: "/" }] },
      } as JsonObject,
    );

    expect(errors).toEqual([]);
  });

  it("accepts the explicit No page transition draft", () => {
    const errors = validateCmsDocuments(null, {
      animations: {
        pageTransition: {
          enabled: false,
          preset: "none",
          enterDurationMs: 320,
          exitDurationMs: 220,
        },
      },
    } as JsonObject);

    expect(errors).toEqual([]);
  });

  it("blocks unsupported, duplicate, and invalid enabled social links", () => {
    const errors = validateCmsDocuments(null, {
      footer: {
        socialLinks: [
          { id: "a", platform: "instagram", href: "", enabled: true },
          {
            id: "b",
            platform: "instagram",
            href: "https://instagram.com/b",
            enabled: true,
          },
          {
            id: "c",
            platform: "myspace",
            href: "https://example.com",
            enabled: true,
          },
        ],
      },
    } as JsonObject);

    expect(errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "invalid-social-url",
        "duplicate-social-platform",
        "unsupported-social-platform",
      ]),
    );
  });

  it("blocks duplicate, hidden, missing, and draft-only service references", () => {
    const site = {
      footer: {
        selectedServiceIds: [
          "one",
          "one",
          "hidden",
          "missing",
          "draft-only",
          "two",
          "three",
          "four",
        ],
      },
    } as JsonObject;
    const servicesDraft = {
      services: [
        { id: "one", title: "One", visible: true },
        { id: "hidden", title: "Hidden", visible: false },
        { id: "draft-only", title: "Draft Only", visible: true },
        { id: "two", title: "Two", visible: true },
        { id: "three", title: "Three", visible: true },
        { id: "four", title: "Four", visible: true },
      ],
    } as JsonObject;
    const servicesPublished = {
      services: [
        { id: "one", title: "One", visible: true },
        { id: "two", title: "Two", visible: true },
        { id: "three", title: "Three", visible: true },
        { id: "four", title: "Four", visible: true },
      ],
    } as JsonObject;

    const errors = validateCmsDocuments(null, site, {
      servicesDraft,
      servicesPublished,
      publishingServices: false,
    });

    expect(errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "too-many-footer-services",
        "duplicate-service-reference",
        "hidden-service-reference",
        "unknown-service-reference",
        "unpublished-service-reference",
      ]),
    );
  });

  it("allows a draft-only service when Services publishes in the same operation", () => {
    const site = {
      footer: { selectedServiceIds: ["draft-only"] },
    } as JsonObject;
    const servicesDraft = {
      services: [{ id: "draft-only", title: "Draft Only", visible: true }],
    } as JsonObject;

    expect(
      validateCmsDocuments(null, site, {
        servicesDraft,
        servicesPublished: { services: [] } as JsonObject,
        publishingServices: true,
      }),
    ).toEqual([]);
  });
});

describe("footer references to sub-services", () => {
  const hierarchy = (overrides: { parentVisible?: boolean; childVisible?: boolean } = {}) =>
    ({
      services: [
        {
          id: "building-contracting-19ayd2u",
          title: "Building Contracting",
          visible: overrides.parentVisible ?? true,
          children: [
            {
              id: "building-maintenance-zt0ndb",
              title: "Building Maintenance",
              visible: overrides.childVisible ?? true,
            },
          ],
        },
      ],
    }) as JsonObject;

  const site = {
    footer: { selectedServiceIds: ["building-maintenance-zt0ndb"] },
  } as JsonObject;

  it("accepts a footer reference to a re-parented sub-service", () => {
    expect(
      validateCmsDocuments(null, site, {
        servicesDraft: hierarchy(),
        servicesPublished: hierarchy(),
        publishingServices: false,
      }),
    ).toEqual([]);
  });

  it("reports a hidden sub-service as hidden, not missing", () => {
    const codes = validateCmsDocuments(null, site, {
      servicesDraft: hierarchy({ childVisible: false }),
      servicesPublished: hierarchy(),
      publishingServices: false,
    }).map((error) => error.code);
    expect(codes).toEqual(["hidden-service-reference"]);
  });

  it("treats a sub-service under a hidden parent as hidden", () => {
    const codes = validateCmsDocuments(null, site, {
      servicesDraft: hierarchy({ parentVisible: false }),
      servicesPublished: hierarchy(),
      publishingServices: false,
    }).map((error) => error.code);
    expect(codes).toEqual(["hidden-service-reference"]);
  });
});

describe("service slug validation", () => {
  const codes = (document: JsonObject) =>
    validateCmsDocuments(document, null).map((error) => error.code);

  it("rejects a slug with unsupported characters", () => {
    expect(
      codes({
        servicesSchema: 2,
        services: [{ id: "a", title: "A", slug: "Not A Slug", detail: {} }],
      }),
    ).toContain("invalid-service-slug");
  });

  it("rejects an empty slug", () => {
    expect(
      codes({
        servicesSchema: 2,
        services: [{ id: "a", title: "A", slug: "", detail: {} }],
      }),
    ).toContain("invalid-service-slug");
  });

  it("rejects two services sharing a slug", () => {
    expect(
      codes({
        servicesSchema: 2,
        services: [
          { id: "a", title: "A", slug: "shade", detail: {} },
          { id: "b", title: "B", slug: "shade", detail: {} },
        ],
      }),
    ).toContain("duplicate-service-slug");
  });

  it("rejects two children of one parent sharing a slug", () => {
    expect(
      codes({
        servicesSchema: 2,
        services: [
          {
            id: "a",
            title: "A",
            slug: "parent",
            detail: {},
            children: [
              { id: "c1", title: "C1", slug: "dup", detail: {} },
              { id: "c2", title: "C2", slug: "dup", detail: {} },
            ],
          },
        ],
      }),
    ).toContain("duplicate-service-slug");
  });

  it("allows children of different parents to share a slug", () => {
    expect(
      codes({
        servicesSchema: 2,
        services: [
          {
            id: "a",
            title: "A",
            slug: "one",
            detail: {},
            children: [{ id: "c1", title: "C", slug: "same", detail: {} }],
          },
          {
            id: "b",
            title: "B",
            slug: "two",
            detail: {},
            children: [{ id: "c2", title: "C", slug: "same", detail: {} }],
          },
        ],
      }),
    ).not.toContain("duplicate-service-slug");
  });

  it("ignores documents that are not the services document", () => {
    expect(codes({ hero: { title: "Home" } })).not.toContain(
      "invalid-service-slug",
    );
  });
});

describe("blog post validation", () => {
  const post = (over: JsonObject = {}): JsonObject => ({
    title: "Smart Farming",
    slug: "smart-farming",
    category: "technology",
    status: "published",
    publishedAt: "2026-04-25",
    body: [{ id: "b1", type: "paragraph", text: "Body." }],
    ...over,
  });

  const codes = (document: JsonObject) =>
    validateCmsDocuments(document, null, {
      blogIndexDraft: {
        categories: [{ id: "c1", slug: "technology", label: "Technology" }],
      },
    }).map((error) => error.code);

  it("requires a title", () => {
    expect(codes(post({ title: "" }))).toContain("missing-blog-title");
  });

  it("requires a URL-safe slug", () => {
    expect(codes(post({ slug: "Not A Slug" }))).toContain("invalid-blog-slug");
    expect(codes(post({ slug: "" }))).toContain("invalid-blog-slug");
  });

  it("requires an ISO publication date", () => {
    expect(codes(post({ publishedAt: "25/04/2026" }))).toContain("invalid-blog-date");
  });

  it("requires a known status", () => {
    expect(codes(post({ status: "live" }))).toContain("invalid-blog-status");
  });

  it("requires the category to exist in the index", () => {
    expect(codes(post({ category: "nope" }))).toContain("unknown-blog-category");
    expect(codes(post())).not.toContain("unknown-blog-category");
  });

  it("refuses to publish an empty article", () => {
    expect(codes(post({ body: [] }))).toContain("empty-blog-body");
    expect(codes(post({ body: [], status: "draft" }))).not.toContain("empty-blog-body");
  });

  it("rejects an unrecognised block type", () => {
    expect(codes(post({ body: [{ id: "b1", type: "script", text: "x" }] }))).toContain(
      "unknown-block-type",
    );
  });

  it("accepts a well-formed post", () => {
    expect(codes(post())).toEqual([]);
  });

  it("ignores documents that are not blog posts", () => {
    expect(
      validateCmsDocuments({ hero: { title: "Home" } }, null).map((e) => e.code),
    ).not.toContain("missing-blog-title");
  });
});

describe("updates validation", () => {
  const document = (over: JsonObject = {}): JsonObject => ({
    types: [{ id: "t1", slug: "milestone", label: "Milestone" }],
    entries: [
      {
        id: "e1",
        headline: "Foundation poured",
        postedAt: "2026-04-25T10:00:00.000Z",
        type: "milestone",
        status: "published",
      },
    ],
    ...over,
  });

  const codes = (doc: JsonObject) =>
    validateCmsDocuments(doc, null).map((error) => error.code);

  it("requires a headline", () => {
    expect(
      codes(
        document({
          entries: [{ id: "e1", postedAt: "2026-04-25T10:00:00.000Z", status: "draft" }],
        }),
      ),
    ).toContain("missing-update-headline");
  });

  it("requires a parseable posted date", () => {
    expect(
      codes(document({ entries: [{ id: "e1", headline: "H", postedAt: "nope", status: "draft" }] })),
    ).toContain("invalid-update-date");
    expect(
      codes(document({ entries: [{ id: "e1", headline: "H", status: "draft" }] })),
    ).toContain("invalid-update-date");
  });

  it("requires a known status", () => {
    expect(
      codes(
        document({
          entries: [
            {
              id: "e1",
              headline: "H",
              postedAt: "2026-04-25T10:00:00.000Z",
              status: "live",
            },
          ],
        }),
      ),
    ).toContain("invalid-update-status");
  });

  it("rejects a type not in the document's type list", () => {
    expect(
      codes(
        document({
          entries: [
            {
              id: "e1",
              headline: "H",
              postedAt: "2026-04-25T10:00:00.000Z",
              status: "draft",
              type: "nonexistent",
            },
          ],
        }),
      ),
    ).toContain("unknown-update-type");
  });

  it("accepts an entry with no type set", () => {
    expect(
      codes(
        document({
          entries: [
            {
              id: "e1",
              headline: "H",
              postedAt: "2026-04-25T10:00:00.000Z",
              status: "draft",
            },
          ],
        }),
      ),
    ).not.toContain("unknown-update-type");
  });

  it("points errors at the entry's index in the array", () => {
    const errors = validateCmsDocuments(
      document({
        entries: [
          {
            id: "e1",
            headline: "Fine",
            postedAt: "2026-04-25T10:00:00.000Z",
            status: "published",
          },
          { id: "e2", headline: "", postedAt: "nope", status: "draft" },
        ],
      }),
      null,
    );
    const headlineError = errors.find((e) => e.code === "missing-update-headline");
    expect(headlineError?.path).toEqual(["entries", 1, "headline"]);
  });

  it("accepts a well-formed updates document", () => {
    expect(codes(document())).toEqual([]);
  });

  it("ignores documents that are not the updates document", () => {
    expect(
      validateCmsDocuments({ hero: { title: "Home" } }, null).map((e) => e.code),
    ).not.toContain("missing-update-headline");
  });

  it("does not mistake a blog post or project for the updates document", () => {
    const blogPost = {
      title: "T",
      slug: "t",
      status: "draft",
      publishedAt: "2026-04-25",
      body: [],
    };
    const project = {
      title: "T",
      slug: "t",
      status: "draft",
      facts: {},
      serviceRefs: [],
    };
    expect(codes(blogPost)).not.toContain("missing-update-headline");
    expect(codes(project)).not.toContain("missing-update-headline");
  });

  it("does not mistake the updates document for a blog post or project", () => {
    const allCodes = validateCmsDocuments(document(), null).map((e) => e.code);
    expect(allCodes).not.toContain("missing-blog-title");
    expect(allCodes).not.toContain("missing-project-title");
  });
});

describe("footer references that must not block unrelated publishes", () => {
  const catalogue = (id: string, slug?: string) =>
    ({
      services: [
        { id, title: "Building Maintenance", visible: true, ...(slug ? { slug } : {}) },
      ],
    }) as JsonObject;

  it("accepts a service published under a different ID but the same address", () => {
    // IDs are derived from position/title until saved, so draft and
    // published can disagree for the same service.
    const site = { footer: { selectedServiceIds: ["draft-id"] } } as JsonObject;
    expect(
      validateCmsDocuments(null, site, {
        servicesDraft: catalogue("draft-id", "building-maintenance"),
        servicesPublished: catalogue("published-id", "building-maintenance"),
        publishingServices: false,
      }),
    ).toEqual([]);
  });

  it("does not re-check selections that are already live on the site", () => {
    const site = { footer: { selectedServiceIds: ["stale-id"] } } as JsonObject;
    expect(
      validateCmsDocuments(null, site, {
        servicesDraft: { services: [] } as JsonObject,
        servicesPublished: { services: [] } as JsonObject,
        publishingServices: false,
        sitePublished: site,
      }),
    ).toEqual([]);
  });

  it("still blocks a newly added selection that is not published", () => {
    const site = { footer: { selectedServiceIds: ["new-id"] } } as JsonObject;
    const codes = validateCmsDocuments(null, site, {
      servicesDraft: catalogue("new-id", "brand-new"),
      servicesPublished: { services: [] } as JsonObject,
      publishingServices: false,
      sitePublished: { footer: { selectedServiceIds: [] } } as JsonObject,
    }).map((error) => error.code);
    expect(codes).toEqual(["unpublished-service-reference"]);
  });
});

describe("footer never writes a selection just because edit mode opened", () => {
  it("has no effect that seeds selectedServiceIds", async () => {
    const { readFileSync } = await import("node:fs");
    const footer = readFileSync("components/footer.tsx", "utf8");
    expect(footer).not.toMatch(/useEffect\([\s\S]{0,200}selectedServiceIds/);
  });
});
