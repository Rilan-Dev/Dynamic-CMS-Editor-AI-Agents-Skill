import type { JsonObject } from "@/components/cms/json";

export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "youtube",
  "tiktok",
  "whatsapp",
  "website",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface StoredFooterSocialLink {
  id: string;
  platform: string;
  href: string;
  enabled: boolean;
}

export interface FooterSocialLink extends StoredFooterSocialLink {
  platform: SocialPlatform;
}

export const SOCIAL_PLATFORM_META: Record<
  SocialPlatform,
  { label: string; placeholder: string }
> = {
  facebook: { label: "Facebook", placeholder: "https://facebook.com/your-page" },
  instagram: { label: "Instagram", placeholder: "https://instagram.com/your-account" },
  linkedin: {
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/your-company",
  },
  x: { label: "X / Twitter", placeholder: "https://x.com/your-account" },
  youtube: { label: "YouTube", placeholder: "https://youtube.com/@your-channel" },
  tiktok: { label: "TikTok", placeholder: "https://tiktok.com/@your-account" },
  whatsapp: { label: "WhatsApp", placeholder: "https://wa.me/971500000000" },
  website: { label: "Website", placeholder: "/contact or https://example.com" },
};

export const isSocialPlatform = (value: unknown): value is SocialPlatform =>
  typeof value === "string" &&
  (SOCIAL_PLATFORMS as readonly string[]).includes(value);

const normalizedToken = (value: unknown): string =>
  typeof value === "string"
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, "")
    : "";

const LEGACY_PLATFORM_ALIASES: Record<string, SocialPlatform> = {
  facebook: "facebook",
  instagram: "instagram",
  linkedin: "linkedin",
  twitter: "x",
  x: "x",
  youtube: "youtube",
  tiktok: "tiktok",
  whatsapp: "whatsapp",
  website: "website",
  globe: "website",
  externallink: "website",
};

const enabledValue = (entry: JsonObject): boolean =>
  typeof entry.enabled === "boolean"
    ? entry.enabled
    : typeof entry.visible === "boolean"
      ? entry.visible
      : true;

export function migrateSocialLinks(value: unknown): StoredFooterSocialLink[] {
  if (!Array.isArray(value)) return [];

  const legacySeen = new Set<SocialPlatform>();
  const result: StoredFooterSocialLink[] = [];

  value.forEach((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const entry = raw as JsonObject;

    if (typeof entry.platform === "string") {
      result.push({
        id:
          typeof entry.id === "string" && entry.id.trim()
            ? entry.id
            : `social-${index}`,
        platform: entry.platform,
        href: typeof entry.href === "string" ? entry.href.trim() : "",
        enabled: enabledValue(entry),
      });
      return;
    }

    const platform =
      LEGACY_PLATFORM_ALIASES[normalizedToken(entry.label)] ??
      LEGACY_PLATFORM_ALIASES[normalizedToken(entry.icon)];

    if (!platform || legacySeen.has(platform)) return;
    legacySeen.add(platform);
    result.push({
      id: platform,
      platform,
      href: typeof entry.href === "string" ? entry.href.trim() : "",
      enabled: enabledValue(entry),
    });
  });

  return result;
}

export function normalizeSocialLinks(value: unknown): FooterSocialLink[] {
  const seen = new Set<SocialPlatform>();
  return migrateSocialLinks(value).filter(
    (entry): entry is FooterSocialLink => {
      if (!isSocialPlatform(entry.platform) || seen.has(entry.platform)) {
        return false;
      }
      seen.add(entry.platform);
      return true;
    },
  );
}

export function availableSocialPlatforms(
  entries: StoredFooterSocialLink[],
): SocialPlatform[] {
  const used = new Set(
    entries.map((entry) => entry.platform).filter(isSocialPlatform),
  );
  return SOCIAL_PLATFORMS.filter((platform) => !used.has(platform));
}

export function validateSocialHref(
  platform: SocialPlatform,
  href: string,
): { valid: boolean; message: string } {
  const trimmed = href.trim();
  if (!trimmed) {
    return {
      valid: false,
      message: "Enter a link before enabling this platform.",
    };
  }

  const isInternalWebsiteLink =
    platform === "website" &&
    (trimmed.startsWith("#") ||
      (trimmed.startsWith("/") && !trimmed.startsWith("//")));
  if (isInternalWebsiteLink) {
    return { valid: true, message: "" };
  }

  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol)
      ? { valid: true, message: "" }
      : { valid: false, message: "Use an HTTP or HTTPS link." };
  } catch {
    return { valid: false, message: "Enter a complete valid URL." };
  }
}
