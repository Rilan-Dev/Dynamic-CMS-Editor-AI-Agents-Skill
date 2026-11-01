/**
 * Colour maths for the theme tokens. Pure functions, no DOM — the test
 * environment here is "node" with no jsdom, so rendered colour can never
 * be asserted. Measuring the tokens themselves is the substitute.
 */

export type Rgb = [number, number, number];

/** HSL (h in degrees, s/l in percent) to 8-bit RGB. */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const lum = l / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = lum - c / 2;
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Parses `"142 72% 29%"` — the token format used in globals.css. */
export function parseHslTriplet(value: string): Rgb {
  const match = value
    .trim()
    .match(/^(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%$/);
  if (!match) throw new Error(`Not an HSL triplet: "${value}"`);
  return hslToRgb(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** WCAG contrast ratio between two HSL triplet strings. 1:1 … 21:1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseHslTriplet(a));
  const lb = relativeLuminance(parseHslTriplet(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
