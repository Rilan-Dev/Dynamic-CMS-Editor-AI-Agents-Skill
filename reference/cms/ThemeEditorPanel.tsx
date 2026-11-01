"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AlertTriangle, Check, Moon, Palette, RotateCcw, Sun, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_FONT_ID,
  FONT_OPTIONS,
  THEME_COLOR_KEYS,
  THEME_COLOR_LABELS,
  THEME_PRESETS,
  contrastRatio,
  findFont,
  findPreset,
  isHexColor,
  resolvePalette,
  type ThemeColorKey,
  type ThemeMode,
} from "@/components/theme/siteTheme";
import type { JsonObject } from "./json";
import { setPath, useEditingDoc } from "./store";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};

/** Pairs that must stay readable, checked live as colours change. */
const CONTRAST_CHECKS: Array<{ label: string; a: ThemeColorKey; b: ThemeColorKey }> = [
  { label: "Brand on background", a: "brand", b: "background" },
  { label: "Brand on cards", a: "brand", b: "surface" },
  { label: "Text on background", a: "foreground", b: "background" },
  { label: "Secondary text on cards", a: "mutedForeground", b: "surface" },
];

/**
 * Theme editor for the shared `site` document.
 *
 * A docked panel rather than a modal so the page stays fully visible:
 * SiteThemeStyle follows the draft site document, so every change previews
 * live, and switching the Light/Dark tab flips the page into that mode.
 * Everything saves as a draft and ships with the normal Publish button.
 */
export function ThemeEditorPanel({ onClose }: { onClose: () => void }) {
  const site = useEditingDoc("site");
  const { resolvedTheme, setTheme } = useTheme();
  const [mode, setMode] = useState<ThemeMode>(resolvedTheme === "dark" ? "dark" : "light");

  useEffect(() => {
    if (resolvedTheme === "dark" || resolvedTheme === "light") setMode(resolvedTheme);
  }, [resolvedTheme]);

  if (!site) return null;

  const theme = asObject(site.theme);
  const scheme = findPreset(theme.scheme);
  const overrides = asObject(theme[mode]);
  const palette = resolvePalette(theme, mode);

  const chooseMode = (next: ThemeMode) => {
    setMode(next);
    setTheme(next);
  };

  const emptyPalette = () => Object.fromEntries(THEME_COLOR_KEYS.map((key) => [key, ""]));

  // Fonts are independent of the colour scheme and survive a scheme change.
  const chooseScheme = (id: string) =>
    setPath(
      ["theme"],
      { ...theme, scheme: id, light: emptyPalette(), dark: emptyPalette() },
      "site",
    );

  const fonts = asObject(theme.fonts);
  const bodyFont = findFont(fonts.body);
  const headingFont = fonts.heading ? findFont(fonts.heading) : bodyFont;
  const setFont = (role: "body" | "heading", id: string) =>
    setPath(
      ["theme", "fonts"],
      { body: bodyFont.id, heading: headingFont.id, [role]: id },
      "site",
    );

  const setColor = (key: ThemeColorKey, value: string) =>
    setPath(["theme", mode], { ...emptyPalette(), ...overrides, [key]: value }, "site");

  const resetMode = () => setPath(["theme", mode], emptyPalette(), "site");

  const hasOverrides = THEME_COLOR_KEYS.some((key) => isHexColor(overrides[key]));
  const failing = CONTRAST_CHECKS.map((check) => ({
    ...check,
    ratio: contrastRatio(palette[check.a], palette[check.b]),
  })).filter((check) => check.ratio < 4.5);

  return (
    <aside
      data-cms-ui
      aria-label="Theme editor"
      className="fixed right-3 top-20 z-[1295] flex font-sans [&_h2]:font-sans [&_h3]:font-sans max-h-[calc(100vh-11rem)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold">Site theme</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onClose}
          aria-label="Close theme editor"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Colour scheme
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((preset) => {
              const active = preset.id === scheme.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => chooseScheme(preset.id)}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${
                    active
                      ? "border-brand bg-brand-soft"
                      : "border-border hover:border-brand hover:bg-accent"
                  }`}
                  title={preset.description}
                >
                  <span className="mb-2 flex gap-1">
                    {[preset.light.brand, preset.light.background, preset.dark.brand, preset.dark.background].map(
                      (color, index) => (
                        <span
                          key={index}
                          className="h-5 w-5 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ),
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    {active && <Check className="h-3 w-3 text-brand" />}
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Choosing a scheme clears your custom colours for both modes.
          </p>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Type className="h-3.5 w-3.5" /> Fonts
          </h3>
          <div className="space-y-2.5">
            {(
              [
                ["heading", "Headings", headingFont],
                ["body", "Body text", bodyFont],
              ] as const
            ).map(([role, label, current]) => (
              <label key={role} className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  {label}
                  {current.id !== DEFAULT_FONT_ID && (
                    <button
                      type="button"
                      onClick={() => setFont(role, DEFAULT_FONT_ID)}
                      className="text-[11px] font-semibold text-brand hover:text-brand-strong"
                    >
                      Reset
                    </button>
                  )}
                </span>
                <select
                  value={current.id}
                  onChange={(event) => setFont(role, event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ fontFamily: `var(${current.variable})` }}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.id} value={font.id} style={{ fontFamily: `var(${font.variable})` }}>
                      {font.label}
                      {font.category === "serif" ? " (serif)" : font.category === "display" ? " (condensed)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p
              className="rounded-lg border border-border bg-background p-3 text-foreground"
              aria-hidden="true"
            >
              <span className="block text-lg font-bold" style={{ fontFamily: `var(${headingFont.variable})` }}>
                Building with trust
              </span>
              <span className="mt-1 block text-xs text-muted-foreground" style={{ fontFamily: `var(${bodyFont.variable})` }}>
                Quality contracting across the UAE since day one.
              </span>
            </p>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customise colours
            </h3>
            <div className="flex rounded-full border border-border p-0.5" role="tablist">
              {(["light", "dark"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={mode === option}
                  onClick={() => chooseMode(option)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    mode === option
                      ? "bg-brand text-brand-contrast"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option === "light" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                  {option === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-2.5">
            {THEME_COLOR_KEYS.map((key) => {
              const custom = isHexColor(overrides[key]);
              return (
                <li key={key} className="flex items-center gap-3">
                  <label
                    className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: palette[key] }}
                  >
                    <input
                      type="color"
                      value={palette[key]}
                      onChange={(event) => setColor(key, event.target.value.toLowerCase())}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label={`${THEME_COLOR_LABELS[key].label} (${mode})`}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{THEME_COLOR_LABELS[key].label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {THEME_COLOR_LABELS[key].hint}
                    </p>
                  </div>
                  <HexInput value={palette[key]} onCommit={(value) => setColor(key, value)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-full"
                    disabled={!custom}
                    onClick={() => setColor(key, "")}
                    title="Use the scheme colour"
                    aria-label={`Reset ${THEME_COLOR_LABELS[key].label}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        {failing.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Low contrast in {mode} mode
            </p>
            <ul className="space-y-0.5 text-foreground">
              {failing.map((check) => (
                <li key={check.label}>
                  {check.label}: {check.ratio.toFixed(1)}:1 (aim for 4.5:1)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!hasOverrides}
          onClick={resetMode}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset {mode} colours
        </Button>
        <p className="text-right text-xs text-muted-foreground">Saved as draft · Publish to go live</p>
      </footer>
    </aside>
  );
}

/** A #rrggbb field that commits only complete, valid values. */
function HexInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim().startsWith("#") ? draft.trim() : `#${draft.trim()}`;
    if (isHexColor(next)) onCommit(next.toLowerCase());
    else setDraft(value);
  };
  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      spellCheck={false}
      maxLength={7}
      className="h-8 w-[5.25rem] shrink-0 rounded-md border border-input bg-background px-2 font-mono text-xs uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label="Hex colour"
    />
  );
}
