/**
 * CMS-editable site theme.
 *
 * The `site` document carries a `theme` object:
 *
 *   theme: {
 *     scheme: "smts-forest",   // a preset id (not `preset`: that key means
 *                              // an animation preset to the validator)
 *     light: { brand: "#15803d", background: "", … },   // "" = use preset
 *     dark:  { brand: "", … },
 *   }
 *
 * An editor picks a preset and may override any of the seven editable
 * colours per mode. Everything else (hover shade, tints, text-on-brand,
 * muted surfaces, focus ring) is derived here, so a single brand change
 * restyles the whole site consistently in both modes.
 *
 * The output is a CSS string of custom properties that overrides the
 * fallbacks in `app/globals.css`. Only `#rrggbb` values are ever emitted —
 * anything else falls back to the preset — so CMS content can never inject
 * CSS through this path.
 */

export const THEME_COLOR_KEYS = [
  "brand",
  "background",
  "surface",
  "foreground",
  "mutedForeground",
  "border",
  "inverse",
  "band",
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];
export type ThemeMode = "light" | "dark";
export type ThemePalette = Record<ThemeColorKey, string>;

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  light: ThemePalette;
  dark: ThemePalette;
}

export const THEME_COLOR_LABELS: Record<ThemeColorKey, { label: string; hint: string }> = {
  brand: { label: "Brand / primary", hint: "Buttons, links, highlights and icons" },
  background: { label: "Page background", hint: "Behind every section" },
  surface: { label: "Cards & panels", hint: "Cards, dropdowns and popovers" },
  foreground: { label: "Text", hint: "Headings and body copy" },
  mutedForeground: { label: "Secondary text", hint: "Descriptions, captions, nav links" },
  border: { label: "Borders", hint: "Dividers, inputs and card outlines" },
  inverse: { label: "Footer", hint: "Footer and dark call-to-action areas" },
  band: { label: "Feature bands", hint: "Large coloured sections, e.g. Why Choose Us" },
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "smts-forest",
    label: "SMTS Forest",
    description: "SMTS green by day; forest bands and a warm gold accent on charcoal by night.",
    light: {
      brand: "#15803d",
      background: "#ffffff",
      surface: "#ffffff",
      foreground: "#13201a",
      mutedForeground: "#4f6159",
      border: "#dfe6e2",
      inverse: "#13201a",
      band: "#15803d",
    },
    dark: {
      brand: "#d4a547",
      background: "#0f1417",
      surface: "#171d21",
      foreground: "#e7ecea",
      mutedForeground: "#9aa8a3",
      border: "#283136",
      inverse: "#0a0e10",
      band: "#123a2a",
    },
  },
  {
    id: "steel-blue",
    label: "Steel Blue",
    description: "Engineering blue on cool slate — corporate and technical.",
    light: {
      brand: "#1d4ed8",
      background: "#ffffff",
      surface: "#ffffff",
      foreground: "#0f172a",
      mutedForeground: "#475569",
      border: "#e2e8f0",
      inverse: "#0f172a",
      band: "#1d4ed8",
    },
    dark: {
      brand: "#5b9bf0",
      background: "#0b1120",
      surface: "#131b2e",
      foreground: "#e5e9f0",
      mutedForeground: "#98a3b8",
      border: "#243049",
      inverse: "#070b15",
      band: "#13294f",
    },
  },
  {
    id: "desert-gold",
    label: "Desert Gold",
    description: "Warm construction amber on sand and deep graphite.",
    light: {
      brand: "#b45309",
      background: "#fffdf8",
      surface: "#ffffff",
      foreground: "#1c1917",
      mutedForeground: "#57534e",
      border: "#ece4d6",
      inverse: "#1c1917",
      band: "#b45309",
    },
    dark: {
      brand: "#e0a526",
      background: "#121110",
      surface: "#1b1917",
      foreground: "#ece8e1",
      mutedForeground: "#aaa298",
      border: "#302c27",
      inverse: "#0b0a09",
      band: "#3b2610",
    },
  },
  {
    id: "graphite-teal",
    label: "Graphite Teal",
    description: "Modern teal on neutral graphite — minimal and premium.",
    light: {
      brand: "#0f766e",
      background: "#ffffff",
      surface: "#ffffff",
      foreground: "#111827",
      mutedForeground: "#4b5563",
      border: "#e5e7eb",
      inverse: "#111827",
      band: "#0f766e",
    },
    dark: {
      brand: "#2bb3a3",
      background: "#101214",
      surface: "#181b1e",
      foreground: "#e6e8ea",
      mutedForeground: "#9ca3ab",
      border: "#2a2e33",
      inverse: "#0a0b0c",
      band: "#0e3834",
    },
  },
];

export const DEFAULT_THEME_PRESET_ID = THEME_PRESETS[0].id;

const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX.test(value);

export const findPreset = (id: unknown): ThemePreset =>
  THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0];

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** The preset merged with the editor's valid overrides, for one mode. */
export function resolvePalette(theme: unknown, mode: ThemeMode): ThemePalette {
  const source = asObject(theme);
  const preset = findPreset(source.scheme);
  const overrides = asObject(source[mode]);
  const palette = { ...preset[mode] };
  for (const key of THEME_COLOR_KEYS) {
    const value = overrides[key];
    if (isHexColor(value)) palette[key] = value.toLowerCase();
  }
  return palette;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/** A `H S% L%` triplet, the format every token in globals.css uses. */
const triplet = ({ h, s, l }: Hsl) => `${round(h)} ${round(clamp(s))}% ${round(clamp(l))}%`;

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Whichever of the two candidates reads better on `background`. */
const readableOn = (background: string, light: string, dark: string) =>
  contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;

/** Every CSS custom property for one mode, derived from its palette. */
export function themeTokens(palette: ThemePalette, mode: ThemeMode): Record<string, string> {
  const brand = hexToHsl(palette.brand);
  const background = hexToHsl(palette.background);
  const dark = mode === "dark";
  // A neutral (white/black) background has no hue of its own, so muted
  // surfaces borrow a faint tint of the brand instead of going plain grey.
  const neutral = background.s < 5;
  const lift = (by: number) =>
    triplet({
      h: neutral ? brand.h : background.h,
      s: neutral ? Math.min(brand.s, 14) : background.s,
      l: dark ? background.l + by : background.l - by,
    });

  const onBrand = readableOn(palette.brand, "#ffffff", dark ? palette.background : "#0b1210");
  const onInverse = readableOn(palette.inverse, "#f1f5f3", "#13201a");
  const band = hexToHsl(palette.band);
  const onBand = readableOn(palette.band, dark ? palette.foreground : "#ffffff", "#0b1210");
  // Icons and highlights inside a band: the brand itself where it stands
  // out enough (gold on a forest band at night), else the band's text colour.
  const bandAccent = contrastRatio(palette.brand, palette.band) >= 3 ? palette.brand : onBand;

  const brandTriplet = triplet(brand);
  return {
    "--background": triplet(background),
    "--foreground": triplet(hexToHsl(palette.foreground)),
    "--card": triplet(hexToHsl(palette.surface)),
    "--card-foreground": triplet(hexToHsl(palette.foreground)),
    "--popover": triplet(hexToHsl(palette.surface)),
    "--popover-foreground": triplet(hexToHsl(palette.foreground)),

    "--brand": brandTriplet,
    // "Strong" means more emphatic against the page: darker on light,
    // lighter on dark — so text-brand-strong on brand-soft chips stays
    // readable, and hover fills still carry the dark brand-contrast label.
    "--brand-strong": triplet({ ...brand, l: dark ? Math.min(brand.l + 9, 72) : brand.l * 0.82 }),
    "--brand-soft": dark
      ? triplet({ h: brand.h, s: Math.min(brand.s, 24), l: background.l + 7 })
      : triplet({ h: brand.h, s: Math.min(brand.s, 76), l: 96.5 }),
    "--brand-soft-strong": dark
      ? triplet({ h: brand.h, s: Math.min(brand.s, 24), l: background.l + 12 })
      : triplet({ h: brand.h, s: Math.min(brand.s, 84), l: 92.5 }),
    "--brand-contrast": triplet(hexToHsl(onBrand)),

    "--primary": brandTriplet,
    "--primary-foreground": triplet(hexToHsl(onBrand)),
    "--ring": brandTriplet,

    "--secondary": lift(dark ? 9 : 4),
    "--secondary-foreground": triplet(hexToHsl(palette.foreground)),
    "--muted": lift(dark ? 9 : 4),
    "--muted-foreground": triplet(hexToHsl(palette.mutedForeground)),
    "--accent": lift(dark ? 12 : 6),
    "--accent-foreground": triplet(hexToHsl(palette.foreground)),

    "--border": triplet(hexToHsl(palette.border)),
    "--input": triplet(hexToHsl(palette.border)),

    "--inverse": triplet(hexToHsl(palette.inverse)),
    "--inverse-foreground": triplet(hexToHsl(onInverse)),

    // Large feature sections. Kept apart from --brand so a bright accent
    // never paints a whole section: in dark mode the band is a deep tone.
    "--band": triplet(band),
    "--band-strong": triplet({ ...band, l: dark ? band.l + 6 : band.l * 0.82 }),
    "--band-foreground": triplet(hexToHsl(onBand)),
    "--band-accent": triplet(hexToHsl(bandAccent)),
  };
}

const block = (selector: string, tokens: Record<string, string>) =>
  `${selector}{${Object.entries(tokens)
    .map(([name, value]) => `${name}:${value};`)
    .join("")}}`;

/**
 * The stylesheet for a `site.theme` value. The selectors are one step more
 * specific than globals.css (`html:root`, `html.dark`), so the result wins
 * wherever the tag lands in the document.
 */
export function themeStylesheet(theme: unknown): string {
  return (
    block("html:root", {
      ...themeTokens(resolvePalette(theme, "light"), "light"),
      ...fontTokens(theme),
    }) +
    block("html.dark", themeTokens(resolvePalette(theme, "dark"), "dark"))
  );
}

export interface FontOption {
  id: string;
  label: string;
  /** The CSS variable app/fonts.ts's next/font instance defines. */
  variable: string;
  category: "sans" | "serif" | "display";
}

/**
 * Fonts an editor can choose. Every one is self-hosted by next/font at
 * build time (app/fonts.ts), so choosing one costs no request to Google
 * and browsers download only the files for the fonts actually in use.
 */
export const FONT_OPTIONS: FontOption[] = [
  { id: "montserrat", label: "Montserrat", variable: "--font-montserrat", category: "sans" },
  { id: "inter", label: "Inter", variable: "--font-inter", category: "sans" },
  { id: "poppins", label: "Poppins", variable: "--font-poppins", category: "sans" },
  { id: "manrope", label: "Manrope", variable: "--font-manrope", category: "sans" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", variable: "--font-plus-jakarta-sans", category: "sans" },
  { id: "dm-sans", label: "DM Sans", variable: "--font-dm-sans", category: "sans" },
  { id: "open-sans", label: "Open Sans", variable: "--font-open-sans", category: "sans" },
  { id: "raleway", label: "Raleway", variable: "--font-raleway", category: "sans" },
  { id: "oswald", label: "Oswald", variable: "--font-oswald", category: "display" },
  { id: "playfair-display", label: "Playfair Display", variable: "--font-playfair-display", category: "serif" },
  { id: "lora", label: "Lora", variable: "--font-lora", category: "serif" },
];

export const DEFAULT_FONT_ID = "montserrat";

export const findFont = (id: unknown): FontOption =>
  FONT_OPTIONS.find((font) => font.id === id) ?? FONT_OPTIONS[0];

/** A font stack: the chosen face, then a same-category system fallback. */
export const fontStack = (font: FontOption) =>
  `var(${font.variable}), ${
    font.category === "serif" ? "ui-serif, Georgia, serif" : "ui-sans-serif, system-ui, sans-serif"
  }`;

/** `--font-body` / `--font-heading` for a `site.theme.fonts` value. */
export function fontTokens(theme: unknown): Record<string, string> {
  const fonts = asObject(asObject(theme).fonts);
  const body = findFont(fonts.body);
  const heading = fonts.heading ? findFont(fonts.heading) : body;
  return { "--font-body": fontStack(body), "--font-heading": fontStack(heading) };
}

/** The `theme` object a fresh site document starts with. */
export function defaultSiteTheme() {
  const empty = Object.fromEntries(THEME_COLOR_KEYS.map((key) => [key, ""]));
  return {
    scheme: DEFAULT_THEME_PRESET_ID,
    light: { ...empty },
    dark: { ...empty },
    fonts: { body: DEFAULT_FONT_ID, heading: DEFAULT_FONT_ID },
  };
}
