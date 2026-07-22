import type { ExperienceItem } from "@/types";

/** Verified work experience (CLAUDE.md §4). Newest first. */
export const experience: ExperienceItem[] = [
  {
    role: "E-commerce & Social Media Operations Lead",
    organisation: "Golden Galore Luxury",
    location: "UK / Remote",
    period: "Jan 2026 – Present",
    current: true,
    responsibilities: [
      "Handle day-to-day online content and product presentation for a luxury goods brand.",
      "Take and edit product images, add watermarks, write item descriptions and prepare listing content.",
      "Create captions, sale posts, raffle updates, giveaway announcements and live-selling materials.",
      "Plan live-selling assets and customer communications, and keep brand presentation consistent with Canva templates.",
    ],
  },
  {
    role: "Digital Marketing & Training Content Lead",
    organisation: "American Advanced Executive Training (AAET)",
    location: "Remote",
    period: "Dec 2025 – Present",
    current: true,
    responsibilities: [
      "Create marketing copy, social content and Canva visuals for executive training programmes.",
      "Develop professional course outlines, agendas, programme summaries and training descriptions.",
      "Plan and schedule social media content for professional and international audiences.",
      "Use AI tools to draft and improve training materials while keeping the wording professional.",
    ],
  },
  {
    role: "AI, Python & Data Training Facilitator",
    organisation: "LPC / International Client Projects",
    location: "UK / International",
    period: "Jul 2025 – Nov 2025",
    current: false,
    responsibilities: [
      "Delivered and co-delivered professional training in Python, data science and financial analysis.",
      "Covered prompt engineering, AI and machine-learning fundamentals for professional groups.",
      "Explained practical topics including Python libraries, exploratory data analysis and Excel analysis.",
      "Built learner-friendly examples to help small and large groups understand technical concepts.",
    ],
  },
  {
    role: "Freelance UX/UI Developer",
    organisation: "Self-employed",
    location: "Remote",
    period: "Jun 2023 – Jul 2023",
    current: false,
    responsibilities: [
      "Designed and developed simple landing pages with clear, responsive layouts.",
      "Applied UX/UI skills to wireframing, page structure and visual improvement.",
      "Focused on user-friendly presentation and basic front-end work.",
    ],
  },
  {
    role: "Pharmacy Assistant",
    organisation: "Windsor Pharmacy",
    location: "Windsor, Berkshire",
    period: "Apr 2023 – May 2023",
    current: false,
    responsibilities: [
      "Supported pharmacy operations and customer-facing service.",
      "Worked with pharmacy software, e-prescriptions, EHR systems and inventory tracking.",
      "Handled regulated information accurately within operational software systems.",
    ],
  },
];
