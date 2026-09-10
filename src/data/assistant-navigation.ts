/**
 * Deterministic navigation for the assistant panel.
 *
 * What survived the retirement of the deterministic *answering* engine. These
 * are links, not knowledge: nothing here asserts a fact about OJ, so nothing
 * here can go stale in the way the old answer manifest did. That distinction is
 * the reason this file exists and the matcher does not.
 */

export interface AssistantLink {
  readonly label: string;
  readonly href: string;
}

/**
 * Where to send someone when the assistant cannot help.
 *
 * Shown with every non-answer. A visitor who gets "I can't answer that" and no
 * route onward has been failed twice, and the contact link is deliberately last
 * so it reads as the destination rather than a brush-off.
 */
export const assistantFallbackLinks: readonly AssistantLink[] = [
  { label: "About OJ", href: "/about" },
  { label: "Work", href: "/#projects" },
  { label: "Services", href: "/#services" },
  { label: "Contact OJ", href: "/#contact" },
];
