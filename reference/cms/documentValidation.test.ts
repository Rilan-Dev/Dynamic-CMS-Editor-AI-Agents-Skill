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
