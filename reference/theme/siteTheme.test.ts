import { describe, expect, it } from "vitest";
import { contrastRatio as tripletContrast } from "@/lib/theme/contrast";
import { readThemeTokens } from "@/lib/theme/tokens";
import {
  THEME_COLOR_KEYS,
  THEME_PRESETS,
  defaultSiteTheme,
  hexToHsl,
  resolvePalette,
  themeStylesheet,
  themeTokens,
  FONT_OPTIONS,
  fontTokens,
} from "./siteTheme";
import { readFileSync } from "node:fs";

describe("resolvePalette", () => {
  it("falls back to the default preset for a missing or unknown theme", () => {
    expect(resolvePalette(undefined, "light")).toEqual(THEME_PRESETS[0].light);
    expect(resolvePalette({ scheme: "nope" }, "dark")).toEqual(THEME_PRESETS[0].dark);
  });

  it("applies valid hex overrides and ignores anything else", () => {
    const palette = resolvePalette(
      {
        scheme: "steel-blue",
        dark: { brand: "#AABBCC", background: "red", surface: "#123", border: "" },
      },
      "dark",
    );
    const preset = THEME_PRESETS.find((p) => p.id === "steel-blue")!;
    expect(palette.brand).toBe("#aabbcc");
    expect(palette.background).toBe(preset.dark.background);
    expect(palette.surface).toBe(preset.dark.surface);
    expect(palette.border).toBe(preset.dark.border);
  });
});

describe("themeStylesheet", () => {
  it("cannot be used to inject CSS", () => {
    const css = themeStylesheet({
      light: { brand: "#fff;}</style><script>alert(1)</script>" },
      dark: { brand: "red} body{display:none" },
    });
    expect(css).not.toMatch(/<|script|display|red/);
    expect(css.startsWith("html:root{")).toBe(true);
    expect(css).toContain("html.dark{");
  });
});

describe("hexToHsl", () => {
  it("converts the SMTS green", () => {
    const { h, s, l } = hexToHsl("#15803d");
    expect([Math.round(h), Math.round(s), Math.round(l)]).toEqual([142, 72, 29]);
  });
});

const strip = (tokens: Record<string, string>) =>
  Object.fromEntries(Object.entries(tokens).map(([key, value]) => [key.slice(2), value]));

describe("every preset", () => {
  for (const preset of THEME_PRESETS) {
    for (const mode of ["light", "dark"] as const) {
      it(`${preset.id} (${mode}) is readable`, () => {
        const t = strip(themeTokens(preset[mode], mode));
        const aa = (a: string, b: string) => tripletContrast(t[a], t[b]);
        expect(aa("foreground", "background")).toBeGreaterThanOrEqual(4.5);
        expect(aa("foreground", "card")).toBeGreaterThanOrEqual(4.5);
        expect(aa("muted-foreground", "background")).toBeGreaterThanOrEqual(4.5);
        expect(aa("muted-foreground", "card")).toBeGreaterThanOrEqual(4.5);
        expect(aa("brand", "background")).toBeGreaterThanOrEqual(4.5);
        expect(aa("brand", "card")).toBeGreaterThanOrEqual(4.5);
        expect(aa("brand-contrast", "brand")).toBeGreaterThanOrEqual(4.5);
        expect(aa("brand-contrast", "brand-strong")).toBeGreaterThanOrEqual(4.5);
        expect(aa("brand-strong", "brand-soft")).toBeGreaterThanOrEqual(4.5);
        expect(aa("brand", "brand-soft")).toBeGreaterThanOrEqual(4.5);
        expect(aa("inverse-foreground", "inverse")).toBeGreaterThanOrEqual(4.5);
        expect(aa("band-foreground", "band")).toBeGreaterThanOrEqual(4.5);
        expect(aa("band-foreground", "band-strong")).toBeGreaterThanOrEqual(4.5);
        expect(aa("band-accent", "band")).toBeGreaterThanOrEqual(3);
      });
    }
  }
});

describe("globals.css fallback", () => {
  it("matches what the default preset derives, in both modes", () => {
    // SiteThemeStyle overrides these at runtime; they must agree so a page
    // rendered before (or without) the theme style looks identical.
    const { light, dark } = readThemeTokens();
    const preset = THEME_PRESETS[0];
    for (const [name, value] of Object.entries(strip(themeTokens(preset.light, "light")))) {
      expect(light[name], `light --${name}`).toBe(value);
    }
    for (const [name, value] of Object.entries(strip(themeTokens(preset.dark, "dark")))) {
      expect(dark[name], `dark --${name}`).toBe(value);
    }
  });
});

describe("defaultSiteTheme", () => {
  it("starts on the default preset with every colour empty", () => {
    const theme = defaultSiteTheme();
    expect(theme.scheme).toBe(THEME_PRESETS[0].id);
    for (const key of THEME_COLOR_KEYS) {
      expect(theme.light[key]).toBe("");
      expect(theme.dark[key]).toBe("");
    }
  });
});

describe("dark mode never paints a section with the accent", () => {
  it("keeps every preset's dark band deep, not the bright brand", () => {
    for (const preset of THEME_PRESETS) {
      const t = strip(themeTokens(preset.dark, "dark"));
      const lightness = Number(t.band.split(" ")[2].replace("%", ""));
      expect(lightness, preset.id).toBeLessThan(25);
      expect(t.band).not.toBe(t.brand);
    }
  });
});

describe("fonts", () => {
  it("defaults to Montserrat for body and headings", () => {
    expect(fontTokens(undefined)).toEqual({
      "--font-body": "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
      "--font-heading": "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
    });
  });

  it("uses the chosen faces, with a serif fallback for serif headings", () => {
    const tokens = fontTokens({ fonts: { body: "inter", heading: "playfair-display" } });
    expect(tokens["--font-body"]).toBe("var(--font-inter), ui-sans-serif, system-ui, sans-serif");
    expect(tokens["--font-heading"]).toBe("var(--font-playfair-display), ui-serif, Georgia, serif");
  });

  it("falls back to the default for an unknown font and cannot inject CSS", () => {
    const tokens = fontTokens({ fonts: { body: "x;}body{display:none" } });
    expect(tokens["--font-body"]).toContain("--font-montserrat");
    expect(themeStylesheet({ fonts: { heading: "</style>" } })).not.toContain("</style>");
  });

  it("self-hosts every selectable font in app/fonts.ts", () => {
    const fonts = readFileSync("app/fonts.ts", "utf8");
    for (const option of FONT_OPTIONS) {
      expect(fonts, option.id).toContain(`variable: "${option.variable}"`);
    }
  });

  it("puts the font variables on <html>, where :root can resolve them", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain('<html lang="en" className={fontVariables}');
  });
});
