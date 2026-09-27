import type { JsonObject } from "@/components/cms/json";

export const CAREERS_CONTENT: JsonObject = {
  applicationEmail: "info@smtscontracting.com",
  hero: {
    eyebrow: "Careers",
    title: "Build Your Career. Build the Future.",
    description:
      "At SMTS Contracting, we do more than deliver projects. We develop people, strengthen teams, and build lasting careers across the UAE construction sector.",
    primaryButtonLabel: "View Open Positions",
    primaryButtonHref: "#open-positions",
    secondaryButtonLabel: "Why Join SMTS",
    secondaryButtonHref: "#why-join",
    image: {
      src: "/images/home_image.jpg",
      alt: "SMTS construction professionals at work",
    },
    principles: [
      {
        id: "career-principle-integrity",
        icon: "BadgeCheck",
        title: "Integrity",
        description: "We do what is right.",
        visible: true,
      },
      {
        id: "career-principle-excellence",
        icon: "Award",
        title: "Excellence",
        description: "We deliver quality.",
        visible: true,
      },
      {
        id: "career-principle-safety",
        icon: "ShieldCheck",
        title: "Safety",
        description: "We protect people.",
        visible: true,
      },
      {
        id: "career-principle-teamwork",
        icon: "Users",
        title: "Teamwork",
        description: "We achieve together.",
        visible: true,
      },
    ],
  },
  whyJoin: {
    eyebrow: "Why Join Us",
    title: "Why Work With SMTS",
    description:
      "Join a practical, standards-led team where safety, quality, collaboration, and professional growth guide every project.",
    cards: [
      {
        id: "career-value-impactful-projects",
        icon: "Building2",
        title: "Impactful Projects",
        description:
          "Contribute to construction and technical work that supports communities and businesses across the UAE.",
        visible: true,
      },
      {
        id: "career-value-growth-learning",
        icon: "TrendingUp",
        title: "Growth & Learning",
        description:
          "Develop practical knowledge through experienced teams, varied assignments, and continuous improvement.",
        visible: true,
      },
      {
        id: "career-value-safety-first",
        icon: "ShieldCheck",
        title: "Safety First",
        description:
          "Work in an environment that prioritizes responsible planning, awareness, and safe execution.",
        visible: true,
      },
      {
        id: "career-value-great-people",
        icon: "UsersRound",
        title: "Great People",
        description:
          "Collaborate with skilled colleagues who value respect, accountability, and shared success.",
        visible: true,
      },
      {
        id: "career-value-fair-rewarding",
        icon: "BadgeCheck",
        title: "Fair & Rewarding",
        description:
          "Build your career in a performance-focused workplace with role-appropriate recognition and support.",
        visible: true,
      },
      {
        id: "career-value-stability",
        icon: "HeartHandshake",
        title: "Long-Term Stability",
        description:
          "Grow with an established UAE contracting company focused on dependable delivery and lasting relationships.",
        visible: true,
      },
    ],
  },
  culture: {
    eyebrow: "Our Culture",
    title: "A Culture Built on Respect, Trust, and Collaboration",
    paragraphs: [
      "Every team member has an important role in delivering safe, reliable, and high-quality work. We encourage clear communication, responsibility, and mutual respect across offices and project sites.",
      "Our teams learn through practical experience, shared knowledge, and a commitment to improving how we plan, coordinate, and deliver each assignment.",
    ],
    image: {
      src: "/images/about-us/company-overview.jpeg",
      alt: "SMTS team and workplace",
    },
    highlights: [
      {
        id: "career-highlight-experienced-teams",
        icon: "Users",
        title: "Experienced Teams",
        description: "Skilled professionals across our operations",
        visible: true,
      },
      {
        id: "career-highlight-quality",
        icon: "Star",
        title: "Quality Focused",
        description: "Standards-led planning and delivery",
        visible: true,
      },
      {
        id: "career-highlight-uae",
        icon: "MapPinned",
        title: "UAE Based",
        description: "Opportunities across our active projects",
        visible: true,
      },
    ],
  },
  benefits: {
    eyebrow: "Employee Experience",
    title: "Support for Your Working Journey",
    description:
      "The support available to each employee depends on their role, contract, and applicable company policies.",
    cards: [
      {
        id: "career-benefit-health",
        icon: "HeartPulse",
        title: "Health Support",
        description: "Role-dependent medical and wellbeing support.",
        visible: true,
      },
      {
        id: "career-benefit-accident",
        icon: "ShieldPlus",
        title: "Accident Protection",
        description: "Work-related protection according to role and policy.",
        visible: true,
      },
      {
        id: "career-benefit-leave",
        icon: "CalendarDays",
        title: "Paid Leave",
        description: "Leave arrangements based on contract and UAE requirements.",
        visible: true,
      },
      {
        id: "career-benefit-training",
        icon: "GraduationCap",
        title: "Training & Development",
        description: "Practical learning opportunities aligned with role needs.",
        visible: true,
      },
      {
        id: "career-benefit-progression",
        icon: "ChartNoAxesCombined",
        title: "Career Progression",
        description: "Growth opportunities linked to capability and performance.",
        visible: true,
      },
      {
        id: "career-benefit-team",
        icon: "UsersRound",
        title: "Team Activities",
        description: "Initiatives that encourage connection and collaboration.",
        visible: true,
      },
    ],
  },
  jobsIntro: {
    eyebrow: "Current Opportunities",
    title: "Open Positions",
    description:
      "Explore roles across our construction, technical, and safety teams. Select a position to review its responsibilities and requirements.",
    searchLabel: "Search open positions",
    searchPlaceholder: "Search jobs, skills, or departments",
    departmentLabel: "Department",
    departmentAllLabel: "All departments",
    locationLabel: "Location",
    locationAllLabel: "All locations",
    employmentTypeLabel: "Employment type",
    employmentTypeAllLabel: "All employment types",
    resultCountLabel: "Open positions",
    emptyTitle: "No positions match your filters",
    emptyDescription:
      "Clear the filters or send a general application so our team can consider your profile for future opportunities.",
    clearFiltersLabel: "Clear filters",
  },
  jobs: [
    {
      id: "site-engineer",
      title: "Site Engineer",
      department: "Civil",
      location: "Dubai, UAE",
      employmentType: "Full-time",
      experience: "3–5 years",
      summary:
        "Support the planning, coordination, execution, and monitoring of construction activities while maintaining quality, safety, and schedule requirements.",
      responsibilities: [
        "Coordinate daily site activities with supervisors, subcontractors, and project stakeholders.",
        "Monitor drawings, materials, workmanship, progress, and quality requirements.",
        "Prepare site reports, measurements, records, and progress updates for project management.",
      ],
      requirements: [
        "Bachelor’s degree or diploma in Civil Engineering or a related discipline.",
        "Relevant UAE construction-site experience and understanding of safe work practices.",
        "Ability to interpret drawings, coordinate teams, and communicate project information clearly.",
      ],
      skills: ["Site supervision", "Quality control", "AutoCAD", "Reporting"],
      postedDate: "2026-07-23",
      closingDate: "2026-09-30",
      status: "open",
      visible: true,
    },
    {
      id: "civil-foreman",
      title: "Civil Foreman",
      department: "Civil",
      location: "Dubai, UAE",
      employmentType: "Full-time",
      experience: "5+ years",
      summary:
        "Lead civil work crews, coordinate daily resources, and help deliver site activities according to drawings, quality expectations, and safety procedures.",
      responsibilities: [
        "Allocate work to site crews and communicate daily priorities.",
        "Coordinate manpower, tools, materials, and access with the site team.",
        "Check completed work and report progress, constraints, and corrective needs.",
      ],
      requirements: [
        "Proven experience supervising civil construction activities.",
        "Working knowledge of drawings, levels, measurements, and common site practices.",
        "Strong team leadership, coordination, and safety awareness.",
      ],
      skills: ["Crew leadership", "Civil works", "Site coordination", "Measurements"],
      postedDate: "2026-07-23",
      closingDate: "2026-09-30",
      status: "open",
      visible: true,
    },
    {
      id: "mep-technician",
      title: "MEP Technician",
      department: "MEP",
      location: "Dubai, UAE",
      employmentType: "Full-time",
      experience: "3+ years",
      summary:
        "Perform installation, inspection, maintenance, and troubleshooting support for mechanical, electrical, and plumbing systems across project and maintenance assignments.",
      responsibilities: [
        "Carry out assigned MEP installation and maintenance activities safely and accurately.",
        "Inspect equipment and services, identify faults, and report required corrective work.",
        "Maintain tools, work records, and coordination with supervisors and other trades.",
      ],
      requirements: [
        "Technical certificate, diploma, or equivalent practical trade qualification.",
        "Relevant experience in building MEP installation or maintenance work.",
        "Ability to follow drawings, instructions, permit requirements, and safety procedures.",
      ],
      skills: ["MEP maintenance", "Troubleshooting", "Technical drawings", "Safe working"],
      postedDate: "2026-07-23",
      closingDate: "2026-09-30",
      status: "open",
      visible: true,
    },
    {
      id: "hse-officer",
      title: "HSE Officer",
      department: "HSE",
      location: "Dubai, UAE",
      employmentType: "Full-time",
      experience: "3–5 years",
      summary:
        "Promote safe work practices, support compliance activities, and coordinate inspections, awareness, reporting, and corrective actions across project sites.",
      responsibilities: [
        "Conduct routine inspections, toolbox talks, and safety observations.",
        "Support risk assessments, permits, incident reporting, and corrective-action follow-up.",
        "Maintain HSE records and coordinate requirements with project teams and subcontractors.",
      ],
      requirements: [
        "Recognized HSE qualification with relevant construction-site experience.",
        "Knowledge of UAE workplace safety expectations and practical site controls.",
        "Strong observation, reporting, communication, and follow-up skills.",
      ],
      skills: ["Site safety", "Risk assessment", "Incident reporting", "Training"],
      postedDate: "2026-07-23",
      closingDate: "2026-09-30",
      status: "open",
      visible: true,
    },
  ],
  hiringProcess: {
    eyebrow: "What to Expect",
    title: "Our Hiring Process",
    description:
      "The exact process may vary by role, but candidates can generally expect these stages.",
    steps: [
      {
        id: "career-step-apply",
        icon: "FileText",
        title: "Apply",
        description: "Email your CV and a short introduction for the selected role.",
        visible: true,
      },
      {
        id: "career-step-screening",
        icon: "SearchCheck",
        title: "Screening",
        description: "Our team reviews your experience, qualifications, and role fit.",
        visible: true,
      },
      {
        id: "career-step-interview",
        icon: "Users",
        title: "Interview",
        description: "Shortlisted candidates meet the relevant technical and HR teams.",
        visible: true,
      },
      {
        id: "career-step-offer",
        icon: "MailCheck",
        title: "Offer",
        description: "Selected candidates receive role and employment details for review.",
        visible: true,
      },
      {
        id: "career-step-onboarding",
        icon: "Handshake",
        title: "Onboarding",
        description: "Complete joining formalities and prepare to begin with the team.",
        visible: true,
      },
    ],
  },
  generalApplication: {
    eyebrow: "General Application",
    title: "Don’t See a Role That Fits? Send Us Your CV.",
    description:
      "We welcome profiles from skilled professionals who are interested in future construction, technical, safety, and support opportunities with SMTS.",
    emailTitle: "Apply by Email",
    emailDescription:
      "Your email application will open with a prepared message. Attach your CV before sending.",
    buttonLabel: "Send CV by Email",
    image: {
      src: "/images/contact-us/business-hours.jpg",
      alt: "Submit a CV to SMTS Contracting",
    },
  },
  faq: {
    eyebrow: "Candidate Questions",
    title: "Careers FAQ",
    description:
      "Review common questions about opportunities and the application process.",
    items: [
      {
        id: "career-faq-job-types",
        question: "What types of jobs are available at SMTS?",
        answer:
          "Roles may be available across civil construction, MEP, maintenance, HSE, supervision, administration, and project support depending on business requirements.",
        visible: true,
      },
      {
        id: "career-faq-how-apply",
        question: "How can I apply for a role?",
        answer:
          "Open the relevant vacancy, choose Apply Now, complete the prepared email, attach your CV, and send it from your email application.",
        visible: true,
      },
      {
        id: "career-faq-culture",
        question: "What is the work culture like at SMTS?",
        answer:
          "Our teams value safety, responsibility, quality, practical collaboration, respectful communication, and continuous improvement.",
        visible: true,
      },
      {
        id: "career-faq-status",
        question: "When will I know about my application status?",
        answer:
          "Recruitment timelines vary by role. The team contacts candidates selected for the next stage using the details provided in their CV or email.",
        visible: true,
      },
    ],
  },
  finalCta: {
    icon: "Mail",
    title: "Ready to Build Your Future with SMTS?",
    description:
      "Explore current positions or send your CV for future opportunities with our team.",
    buttonLabel: "View Open Positions",
    buttonHref: "#open-positions",
  },
};
