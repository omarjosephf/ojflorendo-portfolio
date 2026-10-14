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
      title: "A newsletter automation, built on camera",
      description:
        "My first public proof build: an automation that helps me write and send my own newsletter, recorded while I make it.",
    },
    {
      iconKey: "portfolio",
      title: "Learn Your Way",
      description:
        "[LEARN YOUR WAY: ONE-LINE DESCRIPTION]",
    },
    {
      iconKey: "study",
      title: "My final year, and CS50",
      description:
        "Finishing my BSc in Computing and IT with The Open University, and working through CS50 alongside it.",
    },
    {
      iconKey: "learn",
      title: "Games with Claude Code",
      description: "A hobby: building small games with Claude Code.",
    },
  ],
  personalNote: "Outside work, I stay active with fitness and boxing.",
};
