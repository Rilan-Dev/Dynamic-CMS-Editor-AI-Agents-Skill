import { describe, expect, it } from "vitest";
import type { JsonObject } from "@/components/cms/json";
import { CONTENT_REGISTRY } from "@/content/registry";

const document = CONTENT_REGISTRY.services as JsonObject;
const services = document.services as JsonObject[];

const childTitles = (title: string): string[] => {
  const parent = services.find((service) => service.title === title);
  return ((parent?.children as JsonObject[]) ?? []).map(
    (child) => String(child.title),
  );
};

describe("services registry hierarchy", () => {
  it("does not ship a schema stamp — normalization owns that", () => {
    // getPageContent merges this fallback under published documents, so a
    // stamp here would mark un-migrated published content as migrated.
    expect(document.servicesSchema).toBeUndefined();
  });

  it("ships exactly the six parent services", () => {
    expect(services.map((service) => service.title)).toEqual([
      "Building Contracting",
      "Shade Installation",
      "Electrical Works",
      "Epoxy Floor Painting",
      "Landscaping Works",
      "Greenhouse Installation",
    ]);
  });

  it("nests the sub-services under their parents", () => {
    expect(childTitles("Building Contracting")).toEqual([
      "Villa Construction",
      "Meet Me Room",
      "Service Block",
      "Building Maintenance",
      "Interior Works",
    ]);
    expect(childTitles("Shade Installation")).toEqual([
      "Steel Structure Fabrication",
    ]);
    expect(childTitles("Electrical Works")).toEqual(["Plumbing Works"]);
    expect(childTitles("Epoxy Floor Painting")).toEqual([
      "Industrial Floor Screeding",
    ]);
    expect(childTitles("Landscaping Works")).toEqual([]);
    expect(childTitles("Greenhouse Installation")).toEqual([
      "Climate Control Installation",
      "Retractable Roof Installation",
    ]);
  });

  it("gives every parent and child an explicit slug", () => {
    for (const service of services) {
      expect(typeof service.slug, String(service.title)).toBe("string");
      expect(String(service.slug)).not.toBe("");
      for (const child of (service.children as JsonObject[]) ?? []) {
        expect(typeof child.slug, String(child.title)).toBe("string");
        expect(String(child.slug)).not.toBe("");
      }
    }
  });

  it("keeps every service's existing summary fields", () => {
    for (const service of services) {
      expect(typeof service.description).toBe("string");
      expect(typeof service.icon).toBe("string");
      expect(typeof service.image).toBe("string");
    }
  });
});
