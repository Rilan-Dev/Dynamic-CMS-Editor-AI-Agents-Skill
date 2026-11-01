import type { JsonObject } from "@/components/cms/json";

/**
 * The /updates document. Entries live here (not in per-update documents):
 * updates have no pages of their own, and the CMS edits the current page's
 * document, so this is what lets editors post inline from the feed.
 */
export function defaultUpdatesIndex(): JsonObject {
  return {
    hero: {
      eyebrow: "Daily Updates",
      title: "News & Site Updates",
      subtitle:
        "Progress from our sites, milestones, certifications and announcements from the SMTS team.",
    },
    filters: { allLabel: "All updates" },
    types: [
      { slug: "site-update", label: "Site Update" },
      { slug: "milestone", label: "Milestone" },
      { slug: "certification", label: "Certification" },
      { slug: "announcement", label: "Announcement" },
    ],
    composer: {
      placeholder: "Share today's update…",
      buttonLabel: "Post update",
    },
    empty: {
      title: "No updates yet",
      body: "Check back soon for news from our sites and teams.",
    },
    navbar: {
      previewTitle: "What's new at SMTS",
      viewAllLabel: "See all updates",
      newLabel: "new",
    },
    announcement: {
      enabled: true,
      label: "New update",
      ctaLabel: "Read update",
    },
    readMoreLabel: "Read more",
    loadMoreLabel: "Load more updates",
    freshnessDays: 7,
    pageSize: 10,
    entries: [],
  };
}

/** A new entry from the inline composer: a draft, timestamped now. */
export function newUpdateEntry(id: string, now: Date, type: string): JsonObject {
  return {
    id,
    headline: "New update",
    postedAt: now.toISOString(),
    type,
    image: "",
    body: "",
    pinned: false,
    status: "draft",
    visible: true,
  };
}
