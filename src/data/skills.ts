import type { SkillGroup } from "@/types";

/**
 * Skills grouped per CLAUDE.md §9: Software/Technical, AI/Training,
 * Data/Analysis, Digital Marketing/Operations. Tags only — never percentage bars.
 * Content is taken verbatim from the verified skills list (CLAUDE.md §4).
 */
export const skillGroups: SkillGroup[] = [
  {
    title: "Software & Technical",
    summary: "Languages, tools and front-end fundamentals I build with.",
    skills: [
      "Python",
      "Java",
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "UX/UI",
      "Jupyter Notebook",
    ],
  },
  {
    title: "AI & Training",
    summary: "Prompting, AI tooling and explaining technical topics clearly.",
    skills: [
      "Prompt engineering",
      "OpenAI & ChatGPT tools",
      "AI-assisted content development",
      "Course outlines",
      "Lesson summaries",
      "Presentations",
      "Learner support",
      "Chatbot concepts",
      "Technical explanations for professional audiences",
    ],
  },
  {
    title: "Data & Analysis",
    summary: "Exploring data and turning it into reporting and insight.",
    skills: [
      "Data analysis",
      "Microsoft Excel",
      "Power BI",
      "Machine-learning fundamentals",
    ],
  },
  {
    title: "Digital Marketing & Operations",
    summary: "Content, brand presentation and e-commerce operations.",
    skills: [
      "Canva",
      "Buffer",
      "Content calendars",
      "Product photography",
      "E-commerce content",
      "Live-selling content",
      "Brand presentation",
      "Facebook",
      "Instagram",
      "TikTok",
      "LinkedIn",
      "Twitter/X",
      "Threads",
    ],
  },
];
