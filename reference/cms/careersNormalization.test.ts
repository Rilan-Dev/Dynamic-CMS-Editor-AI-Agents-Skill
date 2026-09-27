import { describe, expect, it } from "vitest";
import { CONTENT_REGISTRY } from "@/content/registry";
import { normalizeCmsDocument } from "./documentNormalization";
import type { JsonObject } from "./json";

const asObjects = (value: unknown): JsonObject[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is JsonObject =>
          !!entry && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];

describe("Careers CMS normalization", () => {
  it("registers a complete Careers fallback with four seeded roles", () => {
    const careers = CONTENT_REGISTRY.careers;
    expect(careers.applicationEmail).toBe("info@smtscontracting.com");
    expect(asObjects(careers.jobs).map((job) => job.title)).toEqual([
      "Site Engineer",
      "Civil Foreman",
      "MEP Technician",
      "HSE Officer",
    ]);
  });

  it("adds stable IDs and visibility to Careers object arrays", () => {
    const normalized = normalizeCmsDocument("careers", {
      hero: { principles: [{ title: "Safety" }] },
      whyJoin: { cards: [{ title: "Growth" }] },
      culture: { highlights: [{ title: "UAE Based" }] },
      jobs: [{ title: "Site Engineer" }],
      hiringProcess: { steps: [{ title: "Apply" }] },
      faq: { items: [{ question: "How?" }] },
    });

    const arrays = [
      (normalized.hero as JsonObject).principles,
      (normalized.whyJoin as JsonObject).cards,
      (normalized.culture as JsonObject).highlights,
      normalized.jobs,
      (normalized.hiringProcess as JsonObject).steps,
      (normalized.faq as JsonObject).items,
    ];

    arrays.forEach((value) => {
      const [item] = asObjects(value);
      expect(item.id).toEqual(expect.any(String));
      expect(item.visible).toBe(true);
    });
  });

  it("migrates one Careers link into navbar and footer without duplication", () => {
    const once = normalizeCmsDocument("site", {
      navbar: { links: [{ name: "Home", href: "/" }] },
      footer: { links: [{ text: "Home", href: "/" }] },
    });
    const twice = normalizeCmsDocument("site", once);

    const navbar = twice.navbar as JsonObject;
    const navbarCareers = asObjects(navbar.links).filter(
      (link) => link.href === "/careers",
    );
    expect(navbarCareers).toHaveLength(1);

    const footer = twice.footer as JsonObject;
    const footerCareers = asObjects(footer.columns).flatMap((column) =>
      asObjects(column.links).filter((link) => link.href === "/careers"),
    );
    expect(footerCareers).toHaveLength(1);
  });
});
