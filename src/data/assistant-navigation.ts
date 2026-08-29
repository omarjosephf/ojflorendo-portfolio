/**
 * Deterministic navigation for the assistant panel.
 *
 * What survived the retirement of the deterministic *answering* engine. These
 * are links and prompts, not knowledge: nothing here asserts a fact about OJ, so
 * nothing here can go stale in the way the old answer manifest did. That
 * distinction is the reason this file exists and the matcher does not.
 */

export interface AssistantLink {
  readonly label: string;
  readonly href: string;
}

/**
 * Starting points offered when the panel opens.
 *
 * Chosen to cover the four things visitors actually arrive wanting — what he has
 * built, what he can do, whether he is available, and how to reach him — and
 * phrased as a visitor would type them rather than as section headings.
 */
export const suggestedAssistantQuestions = [
  "What projects has OJ built?",
  "What skills and experience does OJ have?",
  "What services does OJ offer?",
  "Is OJ available for work?",
  "How do I get in touch with OJ?",
] as const;

/**
 * Where to send someone when the assistant cannot help.
 *
 * Shown with every non-answer. A visitor who gets "I can't answer that" and no
 * route onward has been failed twice, and the contact link is deliberately last
 * so it reads as the destination rather than a brush-off.
 */
export const assistantFallbackLinks: readonly AssistantLink[] = [
  { label: "About OJ", href: "/#about" },
  { label: "Projects", href: "/#projects" },
  { label: "Services", href: "/#services" },
  { label: "Contact OJ", href: "/#contact" },
];
