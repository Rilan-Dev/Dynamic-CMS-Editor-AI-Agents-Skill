import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads the real stylesheet rather than a duplicated copy of the values.
 * A test that asserts against its own constants proves nothing about what
 * ships.
 */
export function readThemeTokens(): {
  light: Record<string, string>;
  dark: Record<string, string>;
} {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  return { light: block(css, ":root"), dark: block(css, ".dark") };
}

function block(css: string, selector: string): Record<string, string> {
  // The first occurrence is the token block; later `:root` blocks in the
  // file (the CMS chrome) declare non-colour variables and are ignored.
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No "${selector}" block in globals.css`);
  const end = css.indexOf("}", start);
  const body = css.slice(start, end);
  const tokens: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    // Only HSL triplets participate in contrast checks; --radius and the
    // CMS variables are not colours.
    if (/^-?[\d.]+\s+-?[\d.]+%\s+-?[\d.]+%$/.test(value.trim())) {
      tokens[name] = value.trim();
    }
  }
  return tokens;
}
