import type { NowData } from "@/types";

/**
 * "What I'm working on now" snapshot. Data-driven in the same style as the other
 * content. Keep it concise, current and honest: work in progress is described
 * as in progress, never as done.
 */
export const now: NowData = {
  updated: "October 2026",
  items: [
    {
      iconKey: "build",
      title: "Building AI automations and agents",
      description:
        "Automations and agents that take repetitive work off a business, built in public. On camera right now: an automation that writes and sends my newsletter.",
    },
    {
      iconKey: "portfolio",
      title: "Building SaaS tools",
      description:
        "The first is Learn Your Way. It turns any study material into lessons you can read, watch or listen to, so you study the way that suits you and studying becomes something to enjoy.",
    },
    {
      iconKey: "study",
      title: "My final year, and CS50",
      description:
        "Finishing my BSc in Computing and IT with The Open University, and working through CS50 alongside it.",
    },
    {
      iconKey: "learn",
      title: "Building games",
      description: "Game development is my passion. I build games with Claude Code, and I'm working towards releasing my first.",
    },
  ],
  personalNote: "Outside work, I stay active with fitness and boxing.",
};
