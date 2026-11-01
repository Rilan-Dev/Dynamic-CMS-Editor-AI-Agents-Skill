import type { ReactNode } from "react";
import type { SocialPlatform } from "./socialLinks";

const GLYPHS: Record<SocialPlatform, ReactNode> = {
  facebook: (
    <path d="M14 8h3V4h-3c-3 0-5 2-5 5v2H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z" />
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  linkedin: (
    <>
      <rect x="4" y="9" width="3.5" height="11" rx="1" />
      <circle
        cx="5.75"
        cy="5.75"
        r="1.75"
        fill="currentColor"
        stroke="none"
      />
      <path d="M11 20V9h3v1.5c1-1.2 2.2-1.8 3.7-1.8 2.4 0 3.8 1.6 3.8 4.8V20H18v-5.8c0-1.5-.5-2.3-1.7-2.3-1.3 0-1.9.9-1.9 2.8V20Z" />
    </>
  ),
  x: <path d="M5 4h4.2l3.4 4.7L16.8 4H19l-5.4 6.2L20 20h-4.2l-3.9-5.4L7.2 20H5l5.9-6.9Z" />,
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="m10 9 6 3-6 3Z" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: <path d="M14 4v10.2a4.4 4.4 0 1 1-3.8-4.4v3.4a1.5 1.5 0 1 0 .8 1.3V4Zm0 0c.5 2.3 1.8 3.7 4 4.2v3.2c-1.5-.2-2.8-.8-4-1.7" />,
  whatsapp: (
    <>
      <circle cx="12" cy="11.5" r="7.5" />
      <path d="m7 20 1.2-3.1M9 8.5c.7 3 2.5 4.8 5.6 5.7l1.2-1.3-2-1-1 1c-1.4-.6-2.5-1.7-3.1-3.1l1-1-1-2Z" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.3 2.5 3.4 5.5 3.4 9S14.3 18.5 12 21M12 3c-2.3 2.5-3.4 5.5-3.4 9S9.7 18.5 12 21" />
    </>
  ),
};

export function SocialPlatformIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[platform]}
    </svg>
  );
}
