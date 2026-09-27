import { assetSrc } from "@/content/types";
import { ALL_ICONS } from "./icons";

const LEGACY_ICON_URLS: Record<string, string> = {
  building: "/images/services-icons/building-contracting.svg",
  construction: "/images/services-icons/steel-structure-fabrication.svg",
  tool: "/images/services-icons/building-maintenance.svg",
};

export type ResolvedIcon =
  | { kind: "image"; src: string }
  | { kind: "lucide"; name: string };

export function resolveIconValue(
  value: unknown,
  fallback = "Settings",
): ResolvedIcon {
  const raw = assetSrc(value);
  const normalized = LEGACY_ICON_URLS[raw] ?? raw;

  if (/^(?:\/|https?:\/\/|data:image\/)/i.test(normalized)) {
    return { kind: "image", src: normalized };
  }

  const fallbackName = ALL_ICONS[fallback] ? fallback : "Settings";
  return {
    kind: "lucide",
    name: ALL_ICONS[normalized] ? normalized : fallbackName,
  };
}
