import type { JsonObject } from "@/components/cms/json";

export const CONTENT_REGISTRY: Record<string, JsonObject> = {
  site: {
    navbar: {
      logo: { src: "/images/SMTS_logo.svg", alt: "SMTS Contracting LLC" },
      links: [
        { name: "Home", href: "/" },
        { name: "About", href: "/about" },
        { name: "Services", href: "/services" },
        { name: "Certifications", href: "/certifications" },
        { name: "Contact", href: "/contact" },
      ],
      phone: "+97142615654",
    },
    footer: {
      logo: { src: "/images/SMTS_logo.svg", alt: "SMTS Contracting LLC" },
      company: "SMTS Contracting LLC",
      description:
        "SMTS Contracting LLC is a leading UAE-based contracting company specializing in building contracting, maintenance, steel structure fabrication, and more.",
      email: "info@smtscontracting.com",
      address: [
        "AL ASMAWI COMMERCIAL BUILDING",
        "Office #115, Ras Al Khor Industrial Area 2",
        "Dubai, U.A.E",
      ],
      links: [
        { text: "Home", href: "/" },
        { text: "About Us", href: "/about" },
        { text: "Services", href: "/services" },
        { text: "Certifications", href: "/certifications" },
        { text: "Contact Us", href: "/contact" },
      ],
    },
  },
  home: {
    hero: {
      title: "Building the Future with Trust and Excellence",
      description:
        "SMTS Contracting LLC is committed to meeting all the requirements of its clients and regulatory bodies at all times while maintaining minimal costs.",
      ctaContact: "Contact Us",
      ctaServices: "Our Services",
      image: { src: "/images/home_image.jpg", alt: "Construction site" },
    },
    aboutPreview: {
      title: "About SMTS Contracting",
      description:
        "SMTS Contracting LLC is a premier contracting company based in Dubai, UAE, established with a vision to deliver exceptional quality and reliability across a wide range of construction services.",
      image: { src: "/images/About-smts.svg?height=800&width=1200", alt: "SMTS Construction Project" },
      buttonText: "Learn More About Us",
    },
    featuredIntro: {
      title: "Our Services",
      subtitle:
        "We offer a comprehensive range of contracting and contracting services to meet all your project needs.",
      buttonText: "View All Services",
      linkText: "Learn More",
    },
    featuredServices: [
      {
        title: "Building Contracting",
        description:
          "Full-service building contracting for commercial and industrial projects.",
        icon: "/images/services-icons/building-contracting.svg",
      },
      {
        title: "Steel Structure Fabrication",
        description:
          "Custom steel structure design and fabrication for all project types.",
        icon: "/images/services-icons/steel-structure-fabrication.svg",
      },
      {
        title: "Building Maintenance",
        description:
          "Comprehensive maintenance services to keep your property in optimal condition.",
        icon: "/images/services-icons/building-maintenance.svg",
      },
    ],
    whyChoose: {
      title: "Why Choose SMTS Contracting",
      description: "We are committed to excellence in every project we undertake.",
      cards: [
        {
          title: "Quality Assurance",
          description:
            "ISO certified with rigorous quality control processes",
          icon: "CheckCircle",
        },
        {
          title: "Experienced Team",
          description:
            "Skilled professionals with years of industry experience",
          icon: "CheckCircle",
        },
        {
          title: "Timely Delivery",
          description: "Committed to completing projects on schedule",
          icon: "CheckCircle",
        },
        {
          title: "Client Satisfaction",
          description:
            "Customer-centric approach to every project",
          icon: "CheckCircle",
        },
      ],
    },
    clientsSection: {
      title: "Our Clients",
      description: "Trusted by leading organizations across the UAE.",
    },
    clients: [
      { name: "Dubai Municipality", logo: "/images/Client_logo/Dubai-Municipality.svg" },
      { name: "Environment Agency - Abu Thabi", logo: "/images/Client_logo/EnvironmentAgency.svg" },
      { name: "G4S", logo: "/images/Client_logo/G4S.svg" },
      { name: "Tripple D", logo: "/images/Client_logo/TripleD.jpeg" },
      { name: "Terra Solis", logo: "/images/Client_logo/Terrra-Soils.jpg" },
      { name: "Secure P", logo: "/images/Client_logo/SecureP.jpeg" },
      { name: "DP World", logo: "/images/Client_logo/dpworld.jpeg" },
      {
        name: "Mohamed Bin Rashid Housing Establishment",
        logo: "/images/Client_logo/Mohamed-Bin-Rashid-Housing-Est.jpg",
      },
      { name: "Build in Dubai", logo: "/images/Client_logo/Build-in-Dubai.jpg" },
      { name: "Dubai Customs", logo: "/images/Client_logo/Dubai-Customs-PCFC.jpg" },
    ],
    cta: {
      title: "Ready to Start Your Project?",
      description:
        "Contact us today to discuss how SMTS Contracting can bring your construction vision to life.",
      button: "Get in Touch",
    },
  },
  about: {
    hero: {
      title: "About Us",
      description: "Learn about our company, our mission, and our commitment to excellence.",
      image: { src: "/images/about-us/about-us.jpg?height=800&width=1600", alt: "About SMTS Contracting" },
    },
    overview: {
      title: "Company Overview",
      paragraphs: [
        "SMTS Contracting L.L.C was established according to unique standards and deep experience inspired by its vision of construction.",
        "Our services are of the highest quality and workmanship, therefore we ensured continuous development to upgrade our system, which includes our policies and strategic plans, which we contribute actively to enrich our society and earn the trust of our Clients through the consolidation principles: credibility, professionalism and Commitment.",
        "SMTS contracting LLC is one of the leading companies in UAE, specialized in the field of construction and has gained vast experience and has made its name in the construction field.",
      ],
      image: { src: "/images/about-us/company-overview.jpeg", alt: "SMTS Office Building" },
    },
    history: {
      title: "Our History",
      description:
        "SMTS contracting have highly experienced team, who have developed constantly to serve clients of SMTS to meet their needs and have achieved considerable distinction in construction sector with the correct concept by building various construction projects, qualifying to be the leading contractors in the field at the level of UAE.",
      image: { src: "/images/about-us/our-history.jpeg", alt: "SMTS History Timeline" },
    },
    visionMission: {
      title: "Vision & Mission",
      description: "Guided by our core values and commitment to excellence.",
      visionIcon: "Target",
      visionHeading: "Our Vision",
      vision:
        "Our vision is to become a unique and pioneering SMTS company in the UAE, leading strategic investments and driving the development of innovative projects and companies with a scientific and methodical approach. We aim to provide engineering excellence, deliver exceptional value, and uphold the highest standards of governance and transparency. By leveraging our experience, we aspire to be global leaders in the construction and development sectors, offering top-tier solutions and sustainable urban products that meet international standards. Our commitment to quality, innovation, and excellence positions as a trusted partner in shaping the future of urban development.",
      missionIcon: "Briefcase",
      missionHeading: "Our Mission",
      mission:
        "Our company excels in executing construction projects to the highest international standards, offering top-tier services and innovative marketing solutions across all the major economic sectors. By leveraging our resources and deep market insights, we collaborate closely with clients to provide comprehensive, tailored solutions. We are dedicated to driving sustainable growth through the execution of high-quality projects and integrated engineering designs across civil contracting, infrastructure, water, mechanical, electrical, and sanitary works. With a focus on human resources, innovation, and passion for excellence, we prioritize environmental protection and sustainable development. Our commitment to continuous innovation ensures we meet client expectations and deliver optimal results.",
    },
    directorMessage: {
      title: "Message from the Managing Director",
      paragraphs: [
        "\"From a dream to reality—thanks to Allah the Almighty and the dedicated efforts of SMTS Contracting LLC. We've faced challenges and achieved success after success, positioning ourselves among the elite companies in the UAE. With continuous growth,",
        "we strive to enhance our efficiency, embrace modern development, and uphold the trust of our clients. Our team works with one unified spirit,",
        "driven by responsibility and a commitment to excellence. We stand proud of the quality of our performance and the satisfaction of those we serve.",
      ],
      name: "Sujathali Maraican A",
      role: "Managing Director, SMTS Contracting LLC",
      image: { src: "/images/about-us/DM Message Photo.jpg", alt: "Managing Director" },
    },
    groupCompaniesTitle: "Group of Companies",
    groupCompanies: [
      {
        name: "FVISION LANDSCAPING LLC",
        description:
          "Providing landscape design and construction services for residential and commercial properties.",
        image: "/images/Client_logo/Fvision-Logo.png",
      },
      {
        name: "STAR CITY INTERIORS & TECHNICAL SERVICES LLC",
        description:
          "Focusing on interior design and fit-out services for commercial and residential spaces.",
        image: "/images/Client_logo/star_city.svg",
      },
      {
        name: "URBAN HORTICULTURE TRADING LLC",
        description:
          "Specializing in urban landscaping and horticulture services to enhance green spaces in urban areas.",
        image: "/images/Client_logo/Urban Horticulture Logo.png",
      },
      {
        name: "URBAN NEXUS TECHNOLOGY LLC",
        description:
          "Providing advanced technology solutions and smart city innovations for urban development.",
        image: "/images/Client_logo/urban_nexus.svg",
      },
    ],
  },
  services: {
    hero: {
      title: "Our Services",
      description:
        "Comprehensive construction and contracting services to meet all your project needs.",
      image: { src: "/images/our_service.svg?height=800&width=1600", alt: "SMTS Services" },
    },
    description: {
      title: "Comprehensive Contracting Services",
      subtitle:
        "At SMTS Contracting LLC, we offer a wide range of construction and contracting services to meet the diverse needs of our clients. Our team of experienced professionals ensures the highest quality and standards in every project.",
    },
    services: [
      {
        title: "Building Contracting",
        description:
          "Building contracting involves managing construction projects, ensuring timely, budget-friendly completion with highquality standards. Contractors oversee planning, design, and coordination across all disciplines, including structural, electrical, and mechanical works.",
        icon: "/images/services-icons/building-contracting.svg",
        image: "/images/services/services-buildcontract.jpeg?height=600&width=800",
      },
      {
        title: "Building Maintenance",
        description:
          "Building maintenance involves regular inspections, repairs, and servicing to ensure the functionality, safety, and appearance of a building. It includes tasks like plumbing, electrical work, HVAC maintenance, and general upkeep, ensuring the building remains in optimal condition.",
        icon: "/images/services-icons/building-maintenance.svg",
        image: "/images/services/services-buildmaintanence.jpeg?height=600&width=800",
      },
      {
        title: "Shade Installation",
        description:
          "Stay cool and protected with our expert shade installation services. Combining functionality with style, we provide durable solutions tailored to your needs. Shade up your space with us.",
        icon: "/images/services-icons/shade-installation.svg",
        image: "/images/services/services-shades.jpeg?height=600&width=800",
      },
      {
        title: "Steel Structure Fabrication",
        description:
          "Steel structure fabrication involves the design, cutting, shaping, and assembling of steel components for construction projects. This process ensures the creation of durable, high-strength frameworks for buildings and other infrastructure, tailored to specific project requirements.",
        icon: "/images/services-icons/steel-structure-fabrication.svg",
        image: "/images/services/services-steelstructure.jpeg?height=600&width=800",
      },
      {
        title: "Electrical Works",
        description:
          "Power up your projects with our reliable electrical services. From installations to maintenance, we ensure safety, efficiency, and excellence in every connection. Your trusted partner for all things electrical.",
        icon: "/images/services-icons/electrical-works.svg",
        image: "/images/services/service-electrical.jpg?height=600&width=800",
      },
      {
        title: "Plumbing Works",
        description:
          "Ensure smooth flow with our professional plumbing services. From installations to repairs, we deliver reliable solutions with precision and care. Your trusted partner for all your plumbing needs.",
        icon: "/images/services-icons/plumbing-works.svg",
        image: "/images/our_service_2.svg?height=600&width=800",
      },
      {
        title: "Epoxy Floor Painting",
        description:
          "Durable, seamless, and tailored to perfection—our industrial flooring paint solutions ensure strength and style. Enhance your floors with lasting quality and professional precision.",
        icon: "/images/services-icons/epoxy-floor-painting.svg",
        image: "/images/services/services-epoxy.jpeg?height=600&width=800",
      },
      {
        title: "Industrial Floor Screeding",
        description:
          "We provide high-quality industrial floor screeding, delivering durable, smooth, and level surfaces for heavy-duty environmnts like warehouses and factories. Our advanced techniques enhance load capacity and floor aesthetics, preparing surfaces for final finishes.",
        icon: "/images/services-icons/industrial-floor-screeding.svg",
        image: "/images/services/services-indusfloor.jpg?height=600&width=800",
      },
      {
        title: "Landscaping Works",
        description:
          "Transform your outdoor space into a stunning oasis with our expert landscaping services. From lush gardens to elegant hardscapes, we bring nature's beauty to your doorstep. Let's create a landscape that inspires.",
        icon: "/images/services-icons/landscaping-works.svg",
        image: "/images/services/services-landscaping.jpg?height=600&width=800",
      },
      {
        title: "Interior Works",
        description:
          "Bring your vision to life with our bespoke interior works. From elegant designs to flawless finishes, we create spaces that inspire and reflect your style. Transform your interiors with us.",
        icon: "/images/services-icons/interior-works.svg",
        image: "/images/services/services-interiors.jpeg?height=600&width=800",
      },
      {
        title: "Greenhouse Installation",
        description:
          "Grow smarter with our greenhouse installation services. Designed for efficiency and durability, we create spaces where your plants thrive. Let's build your green future today",
        icon: "/images/services-icons/greenhouse-installation.svg",
        image: "/images/services/services-greenhouse.jpeg?height=600&width=800",
      },
      {
        title: "Climate Control Installation",
        description:
          "Achieve perfect conditions with our climate control installation services. Designed for precision and efficiency, we create environments that adapt to your needs. Experience comfort redefined.",
        icon: "/images/services-icons/climate-control.svg",
        image: "/images/services/services-climate.jpg?height=600&width=800",
      },
      {
        title: "Retractable Roof Installation",
        description:
          "Experience versatility and elegance with our retractable roof installation services. Seamlessly blending style and functionality, we create spaces that adapt to every moment. Open up to endless possibilities.",
        icon: "/images/services-icons/retractable-roof-installation.svg",
        image: "/images/services/services-retractableroof.jpg?height=600&width=800",
      },
    ],
    quality: {
      title: "Quality Assurance",
      paragraphs: [
        "At SMTS Contracting LLC, quality is at the core of everything we do. We have implemented rigorous quality control processes to ensure that every project meets the highest standards.",
        "Our ISO certification is a testament to our commitment to quality and continuous improvement. We regularly review and update our processes to incorporate best practices and new technologies.",
        "From material selection to final inspection, we maintain strict quality control at every stage of the project, ensuring that the end result exceeds your expectations.",
      ],
      image: { src: "/images/services/service-iso.jpg?height=800&width=1200", alt: "Quality Assurance" },
    },
    clientApproach: {
      title: "Client-Centric Approach",
      paragraphs: [
        "We believe that successful projects begin with understanding our clients' needs and objectives. Our client-centric approach ensures that we deliver solutions that align with your vision and requirements.",
        "Throughout the project, we maintain open communication and transparency, keeping you informed of progress and addressing any concerns promptly.",
        "Our commitment to client satisfaction extends beyond project completion, with ongoing support and maintenance services to ensure the longevity and performance of your investment.",
      ],
      image: { src: "/images/services/services-client.jpg?height=800&width=1200", alt: "Client Meeting" },
    },
  },
  contact: {
    hero: {
      title: "Contact Us",
      description: "Get in touch with our team to discuss your project requirements.",
      image: { src: "/images/contact-us/contact-us-bg.jpg", alt: "Contact SMTS" },
    },
    infoCards: [
      {
        title: "Our Location",
        description:
          "AL ASMAWI COMMERCIAL BUILDING\nOffice #115, Ras Al Khor Industrial Area 2\nDubai, U.A.E",
        icon: "MapPin",
      },
      {
        title: "Phone",
        description: "+97142615654",
        action: "Call Us",
        href: "tel:+97142615654",
        icon: "Phone",
      },
      {
        title: "Email",
        description: "info@smtscontracting.com",
        action: "Send Email",
        href: "mailto:info@smtscontracting.com",
        icon: "Mail",
      },
    ],
    form: {
      title: "Get in Touch",
      description:
        "Fill out the form below and our team will get back to you as soon as possible.",
      nameLabel: "Full Name",
      emailLabel: "Email",
      phoneLabel: "Phone",
      messageLabel: "Message",
      button: "Send Message",
    },
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d536.993967625461!2d55.35456873194203!3d25.169709000000008!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d23f83ec46b%3A0xf3dad08e36bf9250!2sSMTS%20Contracting%20LLC!5e1!3m2!1sen!2sus!4v1745342578005!5m2!1sen!2sus",
    businessHours: {
      title: "Business Hours",
      hours: [
        { label: "Monday - Saturday", value: "9:00 AM - 6:00 PM" },
        { label: "Sunday", value: "Closed" },
      ],
      visitTitle: "Visit Our Office",
      visitText:
        "We welcome you to visit our office during business hours to discuss your project requirements in person.",
      addressIcon: "Building",
      address:
        "AL ASMAWI COMMERCIAL BUILDING\nOffice #115, Ras Al Khor Industrial Area 2\nDubai, U.A.E",
      image: { src: "/images/contact-us/business-hours.jpg", alt: "SMTS Office" },
    },
    cta: {
      title: "Ready to Start Your Project?",
      description:
        "Contact us today to discuss how SMTS Contracting can bring your construction vision to life.",
      callButton: "Call Us Now",
      callHref: "tel:+97142615654",
      emailButton: "Send Email",
      emailHref: "mailto:info@smtscontracting.com",
    },
  },
  certifications: {
    hero: {
      title: "Certifications & Registrations",
      description:
        "Our commitment to quality, safety, and excellence is reflected in our certifications and registrations.",
      image: { src: "/images/certifications/certification-bg.jpg", alt: "SMTS Certifications" },
    },
    registrationsIntro: {
      title: "Company Registrations",
      subtitle:
        "SMTS Contracting L.L.C is officially registered and licensed by relevant UAE authorities to execute a broad range of contracting and infrastructure works.",
    },
    registrations: [
      {
        title: "Dubai Department of Economic Development",
        description:
          "Commercial license issued by the Dubai Department of Economic Development (DED), authorizing SMTS Contracting L.L.C to operate across various construction disciplines.",
        image: "/images/certifications/SMTS Commercial  License.jpg",
        icon: "Award",
      },
      {
        title: "Federal Tax Authority VAT Registration",
        description:
          "Official VAT registration certificate from the Federal Tax Authority, confirming compliance with UAE tax regulations.",
        image: "/images/certifications/smts-vat.jpg",
        icon: "Award",
      },
      {
        title: "Membership in Dubai Chamber of Commerce",
        description:
          "Membership in the Dubai Chamber of Commerce, enhancing our business network and credibility in the UAE market.",
        image: "/images/certifications/smts-membership.jpg",
        icon: "Award",
      },
    ],
    isoIntro: {
      title: "ISO Certifications",
      subtitle:
        "SMTS Contracting LLC is proud to hold multiple ISO certifications, demonstrating our commitment to quality, environmental responsibility, and workplace safety.",
    },
    isoCertifications: [
      {
        title: "ISO 9001:2015",
        description:
          "Quality Management System certification, demonstrating our commitment to consistent quality and customer satisfaction.",
        image: "/images/certifications/ISO Certificate 9001.jpg",
        icon: "Award",
      },
      {
        title: "ISO 14001:2015",
        description:
          "Environmental Management System certification, reflecting our dedication to environmentally responsible operations.",
        image: "/images/certifications/ISO Certificate 14001.jpg",
        icon: "Award",
      },
      {
        title: "ISO 45001:2018",
        description:
          "Occupational Health and Safety Management System certification, ensuring a safe working environment for all employees.",
        image: "/images/certifications/ISO Certificate 45001.jpg",
        icon: "Award",
      },
    ],
    appreciation: {
      title: "Certificate of Appreciation",
      description:
        "We are honored to be recognized by Dubai Municipality for our consistent performance and contributions in 2024.",
      image: { src: "/images/certifications/SMTS Apprisiation Certificate.jpg", alt: "Certificate of Appreciation - Dubai Municipality" },
    },
    safety: {
      title: "Safety Standards",
      paragraphs: [
        "Safety is a top priority at SMTS Contracting LLC. We adhere to the highest safety standards and regulations to ensure a safe working environment for our employees and subcontractors.",
        "Our ISO 45001:2018 certification demonstrates our commitment to occupational health and safety management, with comprehensive systems in place to identify and mitigate risks.",
        "Regular safety training, inspections, and audits are conducted to maintain and improve our safety performance, ensuring that every project is completed without compromising on safety.",
      ],
      image: { src: "/images/certifications/safety-standards.jpg", alt: "Safety Standards" },
    },
    benefitsIntro: {
      title: "Benefits of Our Certifications",
      subtitle:
        "Our certifications and registrations provide numerous benefits to our clients and stakeholders.",
    },
    benefits: [
      {
        title: "Quality Assurance",
        description:
          "Our ISO 9001 certification ensures consistent quality in all our projects.",
        icon: "CheckCircle",
      },
      {
        title: "Environmental Responsibility",
        description:
          "ISO 14001 certification demonstrates our commitment to minimizing environmental impact.",
        icon: "CheckCircle",
      },
      {
        title: "Workplace Safety",
        description:
          "ISO 45001 certification ensures a safe working environment for all employees and subcontractors.",
        icon: "CheckCircle",
      },
      {
        title: "Regulatory Compliance",
        description:
          "Our municipal registrations ensure compliance with local regulations and requirements.",
        icon: "CheckCircle",
      },
      {
        title: "Risk Management",
        description:
          "Our certifications include comprehensive risk management systems to identify and mitigate potential issues.",
        icon: "CheckCircle",
      },
      {
        title: "Continuous Improvement",
        description:
          "Our management systems are designed for continuous improvement, ensuring we stay at the forefront of industry best practices.",
        icon: "CheckCircle",
      },
    ],
  },
};
