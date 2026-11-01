import { describe, expect, it } from "vitest";
import { CONTENT_REGISTRY } from "@/content/registry";
import { normalizeCmsDocument } from "./documentNormalization";
import { validateCmsDocuments, validateSiteTheme } from "./documentValidation";
import type { JsonObject } from "./json";

const site = (theme: unknown): JsonObject =>
  ({ ...(CONTENT_REGISTRY.site as JsonObject), theme }) as JsonObject;

describe("validateSiteTheme", () => {
  it("accepts the default site document", () => {
    const normalized = normalizeCmsDocument("site", CONTENT_REGISTRY.site as JsonObject);
    expect(validateCmsDocuments(null, normalized)).toEqual([]);
  });

  it("accepts a known preset with hex and empty overrides", () => {
    expect(
      validateSiteTheme(
        site({ scheme: "desert-gold", light: { brand: "#B45309", border: "" }, dark: {} }),
      ),
    ).toEqual([]);
  });

  it("rejects an unknown preset", () => {
    expect(validateSiteTheme(site({ scheme: "neon" })).map((e) => e.code)).toEqual([
      "unknown-theme-preset",
    ]);
  });

  it("rejects colours that are not #rrggbb, pointing at the field", () => {
    const errors = validateSiteTheme(
      site({ scheme: "smts-forest", dark: { brand: "rgb(74, 222, 128)", surface: "#fff" } }),
    );
    expect(errors.map((e) => [e.code, e.path.join(".")])).toEqual([
      ["invalid-theme-color", "theme.dark.brand"],
      ["invalid-theme-color", "theme.dark.surface"],
    ]);
  });

  it("accepts known fonts and rejects unknown ones", () => {
    expect(validateSiteTheme(site({ fonts: { body: "inter", heading: "lora" } }))).toEqual([]);
    expect(
      validateSiteTheme(site({ fonts: { body: "comic-sans" } })).map((e) => [e.code, e.path.join(".")]),
    ).toEqual([["unknown-theme-font", "theme.fonts.body"]]);
  });

  it("ignores a site document without a theme", () => {
    expect(validateSiteTheme({})).toEqual([]);
  });
});
