export interface AssistantLink {
  readonly label: string;
  readonly href: string;
}

export interface AssistantKnowledgeEntry {
  readonly id: string;
  readonly title: string;
  readonly keywords: readonly string[];
  readonly answer: string;
  readonly links: readonly AssistantLink[];
  readonly reviewedOn: string;
  readonly ownerApproved: true;
  /**
   * A general entry answers broad "who is OJ" style questions. Its keywords
   * include conversational lead-ins ("tell me about oj") that also prefix
   * topic questions ("tell me about oj's projects"), so a general entry is
   * only selected when no specific topic matches. See the matcher in
   * `src/lib/portfolio-assistant.ts`.
   */
  readonly general?: boolean;
}

/**
 * Public, owner-approved answers only. This file is shipped to the browser, so it
 * must never contain secrets, private documents, unpublished work, private
 * contact details, internal reports, or claims that are not already public.
 */
export const assistantKnowledge: readonly AssistantKnowledgeEntry[] = [
  {
    id: "identity",
    title: "About OJ",
    keywords: [
      "who is oj",
      "about oj",
      "tell me about oj",
      "background",
      "profile",
      "identity",
    ],
    answer:
      "OJ Florendo Rayatchi is a software developer, AI-focused builder, and creative developer based in Windsor, Berkshire. He is a final-year BSc Computing and IT (Software) student who builds practical, accessible, and security-conscious digital products.",
    links: [{ label: "Read about OJ", href: "/#about" }],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
    general: true,
  },
  {
    id: "projects",
    title: "Projects",
    keywords: [
      "project",
      "projects",
      "portfolio",
      "case study",
      "what has oj built",
      "what does oj build",
      "website",
      "work",
    ],
    answer:
      "OJ's current published project is this Personal Portfolio & Professional Platform. It is a responsive Next.js and TypeScript product built with accessibility, security, performance, testing, and truthful public content as first-class requirements. Additional purposeful software, automation, and AI work is in development and will be published only when it is ready to describe honestly.",
    links: [
      { label: "View selected work", href: "/#projects" },
      {
        label: "Read the portfolio case study",
        href: "/projects/personal-portfolio-website",
      },
    ],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "skills",
    title: "Skills and capabilities",
    keywords: [
      "skill",
      "skills",
      "capability",
      "capabilities",
      "technology",
      "technologies",
      "tech stack",
      "programming",
      "python",
      "next js",
      "nextjs",
      "react",
      "typescript",
      "data",
      "ux",
      "ai skills",
    ],
    answer:
      "OJ's public capabilities include Next.js, React, TypeScript, JavaScript, HTML, CSS, Python, accessible interface development, technical SEO, testing, documentation, data organisation and analysis, Microsoft Excel, Power BI, UX-focused content structure, training materials, and responsible AI-assisted product workflows.",
    links: [{ label: "Explore capabilities", href: "/#skills" }],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "experience",
    title: "Professional experience",
    keywords: [
      "experience",
      "employment",
      "work history",
      "career",
      "job",
      "roles",
      "training facilitator",
      "marketing",
      "ecommerce",
      "e commerce",
      "pharmacy",
    ],
    answer:
      "OJ's published experience spans e-commerce and social-media operations, digital marketing and training content, AI, Python and data training delivery, freelance UX/UI development, and pharmacy operations. The portfolio lists each role with dates, organisations, locations, and verified responsibilities.",
    links: [{ label: "Review experience", href: "/#experience" }],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "education",
    title: "Education and credentials",
    keywords: [
      "education",
      "degree",
      "study",
      "studying",
      "university",
      "qualification",
      "qualifications",
      "credential",
      "credentials",
      "certificate",
      "certification",
      "open university",
      "pcep",
    ],
    answer:
      "OJ is completing a BSc (Honours) Computing and IT (Software) with The Open University, expected in 2026. Published credentials include PCEP - Certified Entry-Level Python Programmer, business-intelligence training, UX/UI design training, Excel development, prompt engineering, and storytelling development.",
    links: [{ label: "View education and credentials", href: "/#education" }],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "services",
    title: "Services",
    keywords: [
      "service",
      "services",
      "hire",
      "help",
      "support",
      "website service",
      "training",
      "consulting",
      "freelance",
      "client",
    ],
    answer:
      "OJ is available for clearly scoped small-to-medium projects, prototypes, training engagements, and ongoing digital support. Public service areas include professional websites and interfaces, Python and data support, structured technical training, and practical digital operations. Every enquiry is reviewed individually so scope, timeline, and outcome remain realistic.",
    links: [
      { label: "Review services", href: "/#services" },
      { label: "Discuss an enquiry", href: "/#contact" },
    ],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "availability",
    title: "Availability",
    keywords: [
      "available",
      "availability",
      "open to work",
      "opportunity",
      "opportunities",
      "internship",
      "part time",
      "remote",
      "collaboration",
      "collaborate",
    ],
    answer:
      "OJ is open to selected remote projects, part-time opportunities, internships, and collaborations. Availability depends on the scope and timing, so the contact section is the authoritative way to discuss a specific opportunity.",
    links: [{ label: "Contact OJ", href: "/#contact" }],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "approach",
    title: "How OJ works",
    keywords: [
      "how does oj work",
      "process",
      "approach",
      "workflow",
      "working style",
      "responsible ai",
      "ai assisted",
      "quality",
      "security",
      "accessibility",
    ],
    answer:
      "OJ starts with the real problem, clarifies users and constraints, communicates uncertainties honestly, uses AI as an accountable support tool rather than a substitute for judgement, builds for the people using the product, and finishes with testing and evidence. Accessibility, security, maintainability, performance, and truthful limitations are considered alongside visual quality.",
    links: [
      { label: "Read how OJ works", href: "/#about" },
      {
        label: "See the engineering case study",
        href: "/projects/personal-portfolio-website",
      },
    ],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "contact",
    title: "Contact",
    keywords: [
      "contact",
      "email",
      "linkedin",
      "github",
      "message oj",
      "reach oj",
      "get in touch",
      "enquiry",
    ],
    answer:
      "Use the Contact section for a project, role, training opportunity, or collaboration. You can also use the published email, LinkedIn, and GitHub links there. This assistant cannot send messages, make bookings, or act on OJ's behalf.",
    links: [{ label: "Go to contact options", href: "/#contact" }],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
  {
    id: "assistant",
    title: "About this assistant",
    keywords: [
      "what are you",
      "are you ai",
      "how do you work",
      "assistant",
      "chatbot",
      "model",
      "free assistant",
      "inference",
      "privacy",
      "stored",
    ],
    answer:
      "OJ Assistant is a curated, deterministic portfolio guide. It selects reviewed answers stored with this website; it does not call an AI model, browse the web, send prompts to a server, retain conversations, or use visitor text for training. It can only answer a small set of approved public portfolio topics.",
    links: [{ label: "Explore the portfolio", href: "/#about" }],
    reviewedOn: "2026-07-30",
    ownerApproved: true,
  },
];

export const suggestedAssistantQuestions = [
  "What does OJ build?",
  "What skills does OJ have?",
  "What experience does OJ have?",
  "What is OJ studying?",
  "How can I contact OJ?",
] as const;
