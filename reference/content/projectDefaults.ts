import type { JsonObject } from "@/components/cms/json";

export interface ProjectSeed {
  title: string;
  slug: string;
  category: string;
}

/**
 * Page chrome for /projects. Project cards are never stored here — each
 * project is its own document. Nothing here names a real client or states
 * a company figure: stats ship hidden until an editor enters real numbers.
 */
export function defaultProjectIndex(): JsonObject {
  return {
    hero: {
      eyebrow: "Our Projects",
      title: "Built to Last, Delivered with Care",
      subtitle:
        "A selection of contracting, fit-out and maintenance work delivered by SMTS teams across the UAE.",
      image: "/images/home_image.jpg",
    },
    filters: { allLabel: "All" },
    categories: [
      { slug: "commercial", label: "Commercial" },
      { slug: "residential", label: "Residential" },
      { slug: "industrial", label: "Industrial" },
      { slug: "hospitality", label: "Hospitality" },
      { slug: "agricultural", label: "Agricultural" },
    ],
    featured: {
      slug: "",
      eyebrow: "Featured Project",
      buttonLabel: "View Project Details",
      locationLabel: "Location",
      areaLabel: "Area",
      completionLabel: "Completion",
    },
    recent: {
      eyebrow: "Selected Projects",
      title: "Our Recent Projects",
      viewAllLabel: "View All Projects",
      cardLinkLabel: "View Details",
      loadMoreLabel: "Load More Projects",
    },
    stats: {
      eyebrow: "Our Impact",
      title: "Delivering across the UAE",
      items: [
        { icon: "Building2", value: "", label: "Projects Completed", visible: false },
        { icon: "Users", value: "", label: "Clients Served", visible: false },
        { icon: "CalendarCheck", value: "", label: "Years of Experience", visible: false },
        { icon: "ShieldCheck", value: "", label: "Safety Record", visible: false },
      ],
    },
    empty: {
      title: "Our portfolio is being updated",
      body: "We are adding recent projects here. Contact our team for references relevant to your requirement.",
      buttonLabel: "Contact Us",
      buttonHref: "/contact",
      noMatch: "No projects match this filter yet.",
    },
    cta: {
      eyebrow: "Let's Build Together",
      title: "Ready to start your project?",
      body: "Tell us about your requirement and our team will come back with a clear scope and timeline.",
      buttonLabel: "Contact Us",
      buttonHref: "/contact",
      image: "/images/home_image.jpg",
    },
    related: { title: "Related Projects", viewAllLabel: "View All Projects" },
    // Labels for /projects/<slug>. They live on the index so every project
    // shares one wording instead of each document carrying its own copy.
    detail: {
      breadcrumbLabel: "Projects",
      factsTitle: "Project Facts",
      clientLabel: "Client",
      consultantLabel: "Consultant",
      valueLabel: "Contract Value",
      locationLabel: "Location",
      areaLabel: "Area",
      durationLabel: "Duration",
      completedLabel: "Completion",
      statusLabel: "Status",
      enquireLabel: "Discuss a Similar Project",
      overviewEyebrow: "Project Overview",
      galleryEyebrow: "Gallery",
      galleryTitle: "Project Gallery",
      servicesEyebrow: "Expertise",
      servicesTitle: "Services Delivered",
      relatedEyebrow: "More Work",
    },
    projectsPerPage: 9,
    // Detail pages stay hidden until an editor explicitly enables them.
    detailPagesEnabled: false,
    projects: [],
  };
}

/** A complete, publishable skeleton so a new project is never a blank page. */
export function defaultProject(seed: ProjectSeed): JsonObject {
  return {
    title: seed.title,
    slug: seed.slug,
    summary: "A one-paragraph summary that appears on the project card and at the top of the page.",
    category: seed.category,
    hero: "/placeholder.svg",
    status: "draft",
    featured: false,
    facts: {
      client: "",
      consultant: "",
      value: "",
      valueVisible: false,
      location: "Dubai, UAE",
      area: "",
      duration: "",
      completedOn: "",
      projectStatus: "Completed",
    },
    scope: [
      { type: "paragraph", text: "Describe the client's requirement and the site conditions." },
      { type: "heading", text: "Scope of work" },
      { type: "checklist", items: ["First work package", "Second work package", "Third work package"] },
      { type: "heading", text: "Outcome" },
      { type: "paragraph", text: "Close with what was delivered and how it performs." },
    ],
    gallery: [],
    serviceRefs: [],
    seo: { title: "", description: "" },
  };
}
