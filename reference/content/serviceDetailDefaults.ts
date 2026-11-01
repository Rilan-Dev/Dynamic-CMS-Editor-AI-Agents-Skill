import type { JsonObject } from "@/components/cms/json";
import { assetSrc } from "./types";

export interface ServiceDetailSeed {
  title: string;
  description: string;
  image: unknown;
}

/**
 * A complete, coherent detail page seeded from a service's own summary
 * fields. Every service gets one on first normalization so all detail
 * routes render before an editor has touched them.
 */
export function defaultServiceDetail(seed: ServiceDetailSeed): JsonObject {
  const image = assetSrc(seed.image);

  return {
    hero: {
      visible: true,
      eyebrow: "Our Services",
      title: seed.title,
      description: seed.description,
      primaryCta: { label: "Request a Consultation", href: "/contact" },
      secondaryCta: { label: "View Our Services", href: "/services" },
      image,
    },
    about: {
      visible: true,
      eyebrow: "About This Service",
      title: "Built for lasting performance",
      body: seed.description,
      image,
      points: [
        { text: "Delivered by an experienced in-house team" },
        { text: "Compliant with UAE standards and approvals" },
        { text: "Backed by responsive after-handover support" },
      ],
      linkLabel: "Talk to our team",
      linkHref: "/contact",
    },
    process: {
      visible: true,
      heading: "Our Process",
      subheading: "A clear path from first conversation to handover.",
      steps: [
        { title: "Consultation" },
        { title: "Site Assessment" },
        { title: "Design" },
        { title: "Approvals" },
        { title: "Execution" },
        { title: "Handover" },
      ],
    },
    applications: {
      visible: true,
      heading: "Applications",
      subheading: "Suited to a wide range of spaces and industries.",
      items: [
        { image, label: "Commercial Buildings" },
        { image, label: "Residential Projects" },
        { image, label: "Industrial Facilities" },
      ],
    },
    whyChoose: {
      visible: true,
      heading: `Why Choose SMTS for ${seed.title}?`,
      subheading: "",
      items: [
        {
          icon: "ShieldCheck",
          title: "Proven Quality",
          description: "Workmanship held to documented standards on every job.",
        },
        {
          icon: "Clock",
          title: "On Schedule",
          description: "Planned sequencing that protects your handover date.",
        },
        {
          icon: "Users",
          title: "Skilled Team",
          description: "Directly employed trades, not subcontracted gaps.",
        },
        {
          icon: "Wrench",
          title: "Ongoing Support",
          description: "Maintenance and callbacks handled by the same team.",
        },
      ],
    },
    projects: {
      visible: true,
      heading: "Related Projects",
      subheading: "A selection of recent work.",
      viewAllHref: "",
      items: [],
    },
    faq: {
      visible: true,
      heading: "Frequently Asked Questions",
      subheading: "Answers to the questions we hear most.",
      items: [
        {
          question: `How long does ${seed.title.toLowerCase()} usually take?`,
          answer:
            "Timelines depend on scope and site conditions. We give a dated programme after the site assessment.",
        },
        {
          question: "Do you handle approvals and permits?",
          answer:
            "Yes. We prepare and submit the required documentation and coordinate with the relevant authorities.",
        },
        {
          question: "Is support available after completion?",
          answer:
            "Yes. Maintenance and callbacks are handled by the same team that delivered the work.",
        },
      ],
    },
    cta: {
      visible: true,
      title: "Let's Build Together",
      body: `Tell us about your ${seed.title.toLowerCase()} requirement and we will come back with a clear scope and price.`,
      buttonLabel: "Start Your Project",
      buttonHref: "/contact",
      supportingTitle: "Ready to get started?",
      supportingBody: "Get in touch with our team for a free consultation.",
    },
  };
}
