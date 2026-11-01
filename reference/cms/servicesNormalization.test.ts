import { describe, expect, it } from "vitest";
import { normalizeCmsDocument } from "./documentNormalization";
import type { JsonObject } from "./json";

const normalize = (document: JsonObject): JsonObject =>
  normalizeCmsDocument("services", document);

describe("services normalization: slugs and detail", () => {
  it("derives a slug for every service that lacks one", () => {
    const result = normalize({
      servicesSchema: 2,
      services: [{ title: "Landscaping Works" }],
    });
    const services = result.services as JsonObject[];
    expect(services[0].slug).toBe("landscaping-works");
  });

  it("keeps an editor-supplied slug untouched", () => {
    const result = normalize({
      servicesSchema: 2,
      services: [{ title: "Landscaping Works", slug: "grounds" }],
    });
    expect((result.services as JsonObject[])[0].slug).toBe("grounds");
  });

  it("de-duplicates colliding slugs by list order", () => {
    const result = normalize({
      servicesSchema: 2,
      services: [{ title: "Shade Installation" }, { title: "Shade Installation" }],
    });
    const services = result.services as JsonObject[];
    expect(services.map((service) => service.slug)).toEqual([
      "shade-installation",
      "shade-installation-2",
    ]);
  });

  it("slugs children within their own parent's namespace", () => {
    const result = normalize({
      servicesSchema: 2,
      services: [
        { title: "Electrical Works", children: [{ title: "Plumbing Works" }] },
        { title: "Shade Installation", children: [{ title: "Plumbing Works" }] },
      ],
    });
    const services = result.services as JsonObject[];
    const first = (services[0].children as JsonObject[])[0];
    const second = (services[1].children as JsonObject[])[0];
    expect(first.slug).toBe("plumbing-works");
    expect(second.slug).toBe("plumbing-works");
  });

  it("seeds a full detail object on parents and children", () => {
    const result = normalize({
      servicesSchema: 2,
      services: [
        {
          title: "Shade Installation",
          description: "Shade that lasts.",
          image: "/images/shade.jpg",
          children: [{ title: "Steel Structure Fabrication" }],
        },
      ],
    });
    const service = (result.services as JsonObject[])[0];
    const detail = service.detail as JsonObject;
    expect((detail.hero as JsonObject).title).toBe("Shade Installation");
    const child = (service.children as JsonObject[])[0];
    expect(((child.detail as JsonObject).hero as JsonObject).title).toBe(
      "Steel Structure Fabrication",
    );
  });

  it("never overwrites detail content an editor has already changed", () => {
    const result = normalize({
      servicesSchema: 2,
      services: [
        {
          title: "Shade Installation",
          detail: { hero: { title: "Custom hero" } },
        },
      ],
    });
    const detail = (result.services as JsonObject[])[0].detail as JsonObject;
    expect((detail.hero as JsonObject).title).toBe("Custom hero");
  });

  it("gives every child a stable id and visible flag", () => {
    const result = normalize({
      servicesSchema: 2,
      services: [{ title: "Electrical Works", children: [{ title: "Plumbing Works" }] }],
    });
    const child = ((result.services as JsonObject[])[0].children as JsonObject[])[0];
    expect(typeof child.id).toBe("string");
    expect(child.id).not.toBe("");
    expect(child.visible).toBe(true);
  });
});

const flatLegacyDocument = (): JsonObject => ({
  services: [
    { id: "a1", title: "Building Contracting" },
    { id: "a2", title: "Building Maintenance" },
    { id: "a3", title: "Shade Installation" },
    { id: "a4", title: "Steel Structure Fabrication" },
    { id: "a5", title: "Electrical Works" },
    { id: "a6", title: "Plumbing Works" },
    { id: "a7", title: "Epoxy Floor Painting" },
    { id: "a8", title: "Industrial Floor Screeding" },
    { id: "a9", title: "Landscaping Works" },
    { id: "a10", title: "Interior Works" },
    { id: "a11", title: "Greenhouse Installation" },
    { id: "a12", title: "Climate Control Installation" },
    { id: "a13", title: "Retractable Roof Installation" },
  ],
});

describe("services normalization: hierarchy migration", () => {
  it("collapses thirteen flat services into six parents", () => {
    const result = normalize(flatLegacyDocument());
    expect((result.services as JsonObject[]).map((s) => s.title)).toEqual([
      "Building Contracting",
      "Shade Installation",
      "Electrical Works",
      "Epoxy Floor Painting",
      "Landscaping Works",
      "Greenhouse Installation",
    ]);
  });

  it("re-parents existing services while preserving their ids", () => {
    const result = normalize(flatLegacyDocument());
    const greenhouse = (result.services as JsonObject[])[5];
    expect((greenhouse.children as JsonObject[]).map((c) => c.id)).toEqual([
      "a12",
      "a13",
    ]);
  });

  it("seeds the three new Building Contracting sub-services", () => {
    const result = normalize(flatLegacyDocument());
    const building = (result.services as JsonObject[])[0];
    expect((building.children as JsonObject[]).map((c) => c.title)).toEqual([
      "Villa Construction",
      "Meet Me Room",
      "Service Block",
      "Building Maintenance",
      "Interior Works",
    ]);
  });

  it("stamps the schema version", () => {
    expect(normalize(flatLegacyDocument()).servicesSchema).toBe(2);
  });

  it("is idempotent across repeated normalization", () => {
    const once = normalize(flatLegacyDocument());
    const twice = normalize(once);
    expect(twice).toEqual(once);
  });

  it("does not resurrect a sub-service the editor deleted after migration", () => {
    const migrated = normalize(flatLegacyDocument());
    const services = (migrated.services as JsonObject[]).map((service, index) =>
      index === 0
        ? {
            ...service,
            children: (service.children as JsonObject[]).filter(
              (child) => child.title !== "Meet Me Room",
            ),
          }
        : service,
    );
    const result = normalize({ ...migrated, services });
    const titles = (
      (result.services as JsonObject[])[0].children as JsonObject[]
    ).map((child) => child.title);
    expect(titles).not.toContain("Meet Me Room");
  });

  it("leaves an already-hierarchical document alone", () => {
    const document: JsonObject = {
      servicesSchema: 2,
      services: [{ id: "p", title: "Landscaping Works", children: [] }],
    };
    const result = normalize(document);
    expect((result.services as JsonObject[]).map((s) => s.title)).toEqual([
      "Landscaping Works",
    ]);
  });
});

describe("services normalization: published documents from production", () => {
  /**
   * getPageContent deep-merges the registry fallback *under* the published
   * document, so any key the registry ships is inherited by published docs
   * that lack it. A `servicesSchema` stamp in the registry would therefore
   * make every un-migrated published document look already-migrated.
   */
  it("migrates a flat published document merged over the registry fallback", async () => {
    const { CONTENT_REGISTRY } = await import("@/content/registry");
    const fallback = CONTENT_REGISTRY.services as JsonObject;
    const publishedFlat: JsonObject = {
      ...fallback,
      services: [
        { id: "a1", title: "Building Contracting" },
        { id: "a2", title: "Building Maintenance" },
        { id: "a3", title: "Shade Installation" },
        { id: "a4", title: "Steel Structure Fabrication" },
        { id: "a5", title: "Electrical Works" },
        { id: "a6", title: "Plumbing Works" },
        { id: "a7", title: "Epoxy Floor Painting" },
        { id: "a8", title: "Industrial Floor Screeding" },
        { id: "a9", title: "Landscaping Works" },
        { id: "a10", title: "Interior Works" },
        { id: "a11", title: "Greenhouse Installation" },
        { id: "a12", title: "Climate Control Installation" },
        { id: "a13", title: "Retractable Roof Installation" },
      ],
    };

    const result = normalize(publishedFlat);
    const services = result.services as JsonObject[];

    expect(services).toHaveLength(6);
    expect(services.map((service) => service.title)).toEqual([
      "Building Contracting",
      "Shade Installation",
      "Electrical Works",
      "Epoxy Floor Painting",
      "Landscaping Works",
      "Greenhouse Installation",
    ]);
    expect(
      (services[0].children as JsonObject[]).map((child) => child.slug),
    ).toContain("villa-construction");
  });

  it("does not ship a schema stamp in the registry fallback", async () => {
    const { CONTENT_REGISTRY } = await import("@/content/registry");
    expect(
      (CONTENT_REGISTRY.services as JsonObject).servicesSchema,
    ).toBeUndefined();
  });
});
