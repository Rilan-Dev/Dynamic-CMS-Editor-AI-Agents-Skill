"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Megaphone, X } from "lucide-react";
import { useCmsStatus } from "@/components/cms/store";
import { assetSrc } from "@/content/types";
import { relativeTime, type UpdateEntry } from "./updatesModel";

const ANNOUNCED_KEY = "smts:updates:announced";
/** Long enough that it never competes with the page's first impression. */
const SHOW_DELAY_MS = 3500;

const readAnnounced = () => {
  try {
    return localStorage.getItem(ANNOUNCED_KEY);
  } catch {
    return null;
  }
};

/**
 * A small "New update" card that slides in once per new post.
 *
 * It appears only for the newest update this visitor has not seen, after a
 * short delay, never on /updates itself and never while the CMS is open.
 * Dismissing it — or reading the update — retires it for that post, so a
 * visitor is told about each update exactly once. Fixed-position, so it
 * causes no layout shift.
 */
export function UpdatesAnnouncement({
  entry,
  typeLabel,
  label,
  ctaLabel,
  now,
}: {
  /** The newest unread entry, or undefined when there is none. */
  entry: UpdateEntry | undefined;
  typeLabel?: string;
  label: string;
  ctaLabel: string;
  now: Date | null;
}) {
  const pathname = usePathname();
  const cmsOpen = useCmsStatus().startsWith("true");
  const [visible, setVisible] = useState(false);
  const [retired, setRetired] = useState<string | null>(null);

  const eligible =
    !!entry && !cmsOpen && pathname !== "/updates" && retired !== entry.id;

  useEffect(() => {
    if (!eligible || !entry) {
      setVisible(false);
      return;
    }
    if (readAnnounced() === entry.id) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible, entry]);

  if (!visible || !entry) return null;

  const retire = () => {
    try {
      localStorage.setItem(ANNOUNCED_KEY, entry.id);
    } catch {
      // Blocked storage: it is still dismissed for this page view.
    }
    setRetired(entry.id);
    setVisible(false);
  };

  const image = assetSrc(entry.image);

  return (
    <aside
      aria-label={label}
      className="fixed bottom-6 left-4 z-40 w-[min(22rem,calc(100vw-6.5rem))] animate-in fade-in slide-in-from-bottom-4 duration-500 sm:left-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand" />
        <button
          type="button"
          onClick={retire}
          aria-label="Dismiss"
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <Link
          href={`/updates#update-${entry.id}`}
          onClick={retire}
          className="group flex gap-3 p-4 pl-5"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
              <Megaphone aria-hidden="true" className="h-6 w-6 text-brand-strong" />
            </span>
          )}
          <span className="min-w-0 pr-5">
            <span className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold uppercase tracking-wide text-brand">
              {label}
              {typeLabel && <span className="normal-case tracking-normal text-muted-foreground">· {typeLabel}</span>}
              {now && (
                <span className="font-medium normal-case tracking-normal text-muted-foreground">
                  · {relativeTime(entry.postedAt, now)}
                </span>
              )}
            </span>
            <span className="mt-1 line-clamp-2 block text-sm font-bold leading-snug text-foreground group-hover:text-brand">
              {entry.headline}
            </span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand">
              {ctaLabel}
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
