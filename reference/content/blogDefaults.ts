import type { JsonObject } from "@/components/cms/json";

export interface BlogPostSeed {
  title: string;
  slug: string;
  category: string;
}

const today = (): string => new Date().toISOString().slice(0, 10);

/** Page chrome for /blogs. Cards are never stored here — see the spec. */
export function defaultBlogIndex(): JsonObject {
  return {
    hero: {
      eyebrow: "Our Blog",
      title: "SMTS Insights",
      subtitle:
        "Construction, maintenance and contracting know-how from our teams across the UAE.",
      image: "/images/our_service.svg",
    },
    search: {
      placeholder: "Search articles…",
      allLabel: "All",
    },
    categories: [
      { slug: "projects", label: "Projects" },
      { slug: "maintenance", label: "Maintenance" },
      { slug: "safety", label: "Safety" },
      { slug: "technology", label: "Technology" },
      { slug: "company-news", label: "Company News" },
    ],
    cta: {
      title: "Planning a project?",
      body: "Talk to our team about your requirement and we will come back with a clear scope.",
      buttonLabel: "Contact Us",
      buttonHref: "/contact",
    },
    postsPerPage: 6,
    posts: [],
  };
}

/** A complete, publishable skeleton so a new post is never a blank page. */
export function defaultBlogPost(seed: BlogPostSeed): JsonObject {
  return {
    title: seed.title,
    slug: seed.slug,
    excerpt: "A short summary that appears on the blog listing card.",
    category: seed.category,
    image: "/placeholder.svg",
    author: "SMTS Contracting",
    publishedAt: today(),
    status: "draft",
    seo: { title: "", description: "" },
    body: [
      {
        type: "paragraph",
        text: "Open with the problem this article solves for the reader.",
      },
      { type: "heading", text: "Why it matters" },
      {
        type: "paragraph",
        text: "Explain the background and why it matters on a live site.",
      },
      {
        type: "checklist",
        items: ["First key point", "Second key point", "Third key point"],
      },
      { type: "heading", text: "What we recommend" },
      {
        type: "paragraph",
        text: "Close with the practical recommendation and a next step.",
      },
    ],
  };
}
