import type { NowData } from "@/types";

/**
 * "What I'm working on now" snapshot. Data-driven in the same style as the other
 * content, ready for a Version 2 migration. Keep it concise, current and honest.
 */
export const now: NowData = {
  updated: "September 2026",
  items: [
    {
      iconKey: "portfolio",
      title: "A clearer client offer",
      description:
        "Focusing this platform on websites and carefully scoped product work, with a clearer way to discuss a project.",
    },
    {
      iconKey: "build",
      title: "Products as evidence",
      description:
        "Developing my own software and AI ideas, with case studies that explain decisions, checks and limitations.",
    },
    {
      iconKey: "learn",
      title: "Sharing the work",
      description:
        "Building a personal brand around the products I make and the useful lessons behind them.",
    },
    {
      iconKey: "study",
      title: "Learning through my own marketing",
      description:
        "Exploring how AI can help me explain and market my own products. I will distinguish experiments from results I can demonstrate.",
    },
  ],
  personalNote: "Outside work, I stay active with fitness and boxing.",
};
