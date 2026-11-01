import { describe, expect, it } from "vitest";
import { DETAIL_SECTION_KEYS } from "@/components/services/serviceHierarchy";
import type { JsonObject } from "@/components/cms/json";
import { defaultServiceDetail } from "./serviceDetailDefaults";

const detail = defaultServiceDetail({
  title: "Shade Installation",
  description: "Durable shade solutions tailored to your space.",
  image: "/images/services/services-shades.jpeg",
});

describe("defaultServiceDetail", () => {
  it("seeds every detail section", () => {
    for (const key of DETAIL_SECTION_KEYS) {
      expect(detail[key], `missing section: ${key}`).toBeTruthy();
    }
  });

  it("uses the service's own title, description and image in the hero", () => {
    const hero = detail.hero as JsonObject;
    expect(hero.title).toBe("Shade Installation");
    expect(hero.description).toBe(
      "Durable shade solutions tailored to your space.",
    );
    expect(hero.image).toBe("/images/services/services-shades.jpeg");
  });

  it("points the primary calls to action at the contact page", () => {
    const hero = detail.hero as JsonObject;
    expect((hero.primaryCta as JsonObject).href).toBe("/contact");
    expect((detail.cta as JsonObject).buttonHref).toBe("/contact");
  });

  it("seeds list sections with at least one editable item", () => {
    expect((detail.process as JsonObject).steps).toHaveLength(6);
    expect((detail.applications as JsonObject).items).not.toHaveLength(0);
    expect((detail.whyChoose as JsonObject).items).not.toHaveLength(0);
    expect((detail.faq as JsonObject).items).not.toHaveLength(0);
  });

  it("leaves the related-projects list empty with no view-all link", () => {
    const projects = detail.projects as JsonObject;
    expect(projects.items).toEqual([]);
    expect(projects.viewAllHref).toBe("");
  });

  it("returns a fresh object each call so seeded docs never share state", () => {
    const other = defaultServiceDetail({
      title: "Other",
      description: "",
      image: "",
    });
    expect(other.hero).not.toBe(detail.hero);
  });
});
