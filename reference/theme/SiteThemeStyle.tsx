"use client";

import { useMemo } from "react";
import type { JsonObject } from "@/components/cms/json";
import { useDocumentBySlug } from "@/components/cms/store";
import { themeStylesheet } from "./siteTheme";

/**
 * Emits the CMS theme as CSS custom properties.
 *
 * Visitors get the published `site.theme`, rendered on the server so there
 * is no flash of the fallback palette. While editing, the same component
 * follows the draft `site` document, so colour changes preview live.
 */
export function SiteThemeStyle({ siteContent }: { siteContent: JsonObject }) {
  const site = useDocumentBySlug<JsonObject>("site", siteContent);
  const css = useMemo(() => themeStylesheet(site?.theme), [site]);
  return <style id="smts-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}
