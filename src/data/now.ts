import type { NowData } from "@/types";

/**
 * "What I'm working on now" snapshot. Data-driven in the same style as the other
 * content, ready for a Version 2 migration. Keep it concise, current and honest.
 */
export const now: NowData = {
  updated: "July 2026",
  items: [
    {
      iconKey: "study",
      title: "Final year of my degree",
      description:
        "Completing my BSc (Honours) Computing and IT (Software) at the Open University.",
    },
    {
      iconKey: "build",
      title: "Portfolio projects",
      description:
        "Building software, AI and data projects to grow my portfolio of real work.",
    },
    {
      iconKey: "portfolio",
      title: "This website",
      description:
        "Designing and improving this personal portfolio and its project case studies.",
    },
    {
      iconKey: "learn",
      title: "Always learning",
      description:
        "Continuing to develop my software engineering and AI skills.",
    },
  ],
  personalNote: "Outside of work, I stay active with fitness and boxing.",
};
