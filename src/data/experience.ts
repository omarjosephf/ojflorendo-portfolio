import type { ExperienceItem } from "@/types";

/**
 * Verified work experience (docs/ENGINEERING_HANDBOOK.md §6.2, content rules). Newest first.
 *
 * Training roles carry `teaching: true` and describe the sessions the owner
 * taught as the instructor (owner decision, 15 October 2026). How the work
 * was obtained stays out of public copy. The pharmacy role is kept on the CV only (owner decision,
 * 14 October 2026): it is real, but it says nothing about the work on offer.
 */
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
    role: "AI Trainer",
    organisation: "LCT International",
    location: "London",
    period: "Sep 2026",
    current: false,
    teaching: true,
    responsibilities: [
      "Taught two modules of the five-day course Advanced AI Implementation and Innovation for professional learners: data-driven decision-making with AI, and rapid experimentation and prototyping.",
      "Ran hands-on labs with AI coding and agent tools, including Claude Code and Codex.",
    ],
  },
  {
    role: "Digital Marketing & Training Content Lead",
    organisation: "American Advanced Executive Training (AAET)",
    location: "Remote",
    period: "Dec 2025 – Jun 2026",
    current: false,
    responsibilities: [
      "Created marketing copy, social content and Canva visuals for executive training programmes.",
      "Developed professional course outlines, agendas, programme summaries and training descriptions.",
      "Planned and scheduled social media content for professional and international audiences.",
      "Used AI tools to draft and improve training materials while keeping the wording professional.",
    ],
  },
  {
    role: "AI, Python & Data Trainer",
    organisation: "London Premier Centre",
    location: "London / International",
    period: "Jul 2025 – Nov 2025",
    current: false,
    teaching: true,
    responsibilities: [
      "Taught professional courses in Python, data science and AI, including a five-day Python for Data Science and AI course.",
      "Covered prompt engineering, AI and machine-learning fundamentals for finance and public-sector groups.",
      "Explained practical topics including Python libraries, exploratory data analysis and Excel analysis.",
      "Built learner-friendly examples to help small and large groups understand technical concepts.",
    ],
  },
  {
    role: "Prompt Engineering Trainer",
    organisation: "London Training for Excellence",
    location: "London",
    period: "Jul 2025",
    current: false,
    teaching: true,
    responsibilities: [
      "Taught prompt-engineering training and prepared the course handouts.",
    ],
  },
  {
    role: "Freelance UX/UI Developer",
    organisation: "Self-employed",
    location: "Remote",
    period: "Jun 2023 – Jul 2023",
    current: false,
    responsibilities: [
      "Designed and developed landing pages with clear, responsive layouts.",
      "Applied UX/UI skills to wireframing, page structure and visual improvement.",
      "Focused on user-friendly presentation and front-end build quality.",
    ],
  },
];
