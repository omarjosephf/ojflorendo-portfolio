import { ASSISTANT_INPUT_LIMIT, type AssistantResult } from "./types";

/**
 * The browser-side privacy stop.
 *
 * **It has exactly one job: stop the *visitor's own* personal, financial or
 * credential data from ever leaving their browser.** It decides nothing about
 * OJ, about the assistant, or about what may be discussed. Those are product
 * policy, and product policy has one authority — the assistant service.
 *
 * ## Why the scope is this narrow
 *
 * It used to be wider. It also carried patterns for injection probes, private
 * contact details, private documents and unpublished work — a second, parallel
 * implementation of the privacy and anti-extraction boundary, written in a
 * different language from the one that enforces it.
 *
 * Two implementations of one policy diverge, and this pair did. Six questions in
 * the 49-question evaluation set were answered by the service during evaluation
 * and by this file in a real browser, so for those six the evaluation measured a
 * code path no visitor could reach. Worse, the browser's answer was the *weaker*
 * one: the corpus explicitly states that OJ's phone number and home address are
 * private and deliberately unpublished, so the service answers "not published,
 * here is where that is stated" with a citation, while this file answered a
 * recruiter asking for a phone number as though they were an attacker.
 *
 * So the policy patterns are gone, and every question about OJ or the assistant
 * now reaches the service. `guard.test.ts` asserts that the whole evaluation set
 * passes through untouched, which is what keeps the evaluation representative of
 * shipped behaviour rather than a promise that it is.
 *
 * ## What is left, and why it is worth keeping
 *
 * Data the visitor typed about *themselves* is different in kind. No server-side
 * control can offer "it was never transmitted", because by the time a server can
 * apply one, it has been. That guarantee only exists here, and it is the one
 * claim the threat model makes for this file.
 *
 * It is a filter, not a proof — a determined paste gets through, and nothing
 * here should be described as preventing prompt injection. The real containment
 * for that is structural: the assistant has no tools, so text is all it can ever
 * produce.
 */

/**
 * A visitor **supplying** a credential.
 *
 * The `[:=]` separator is what distinguishes supplying from asking. "What is
 * your API key?" is a question for the service to answer; "password: hunter2"
 * is a mistake to catch before it is sent.
 */
const suppliedCredentialPatterns: readonly RegExp[] = [
  /\b(?:password|passcode|pin|credit\s*card|bank\s*account)\s*[:=]/i,
];

const personalDataPatterns: readonly RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  // Count digits rather than characters. An earlier form allowed separators to
  // pad the length, so an ordinary date range ("2019 - 2023", 8 digits) tripped
  // the privacy response and a visitor asking about OJ's timeline got a warning
  // instead of an answer. Real numbers carry at least nine digits.
  /(?:\+?\d(?:[\s().-]*\d){8,})/,
];

const PERSONAL_DATA_RESPONSE =
  "Please don't enter personal, financial, account, or credential information " +
  "here. Your message was not sent anywhere. For a private enquiry, use OJ's " +
  "contact options instead.";

/**
 * Trim and bound visitor input before anything else looks at it.
 *
 * Applied before pattern matching so a very long input cannot be used to make
 * the regular expressions do more work than intended, and before transmission
 * so the server never has to trust the client's restraint.
 */
export function boundInput(raw: string): string {
  return raw.trim().slice(0, ASSISTANT_INPUT_LIMIT);
}

/**
 * Check input locally. Returns a result when the input must not be sent, or
 * `null` when it may be.
 *
 * `null` is the answer for every question about OJ, his work, his privacy
 * boundary, the assistant itself, and every probe of any of them. That is not an
 * omission — it is the decision recorded above.
 */
export function screenQuestion(raw: string): AssistantResult | null {
  const question = boundInput(raw);
  if (!question) return null;

  const carriesPersonalData =
    suppliedCredentialPatterns.some((pattern) => pattern.test(question)) ||
    personalDataPatterns.some((pattern) => pattern.test(question));

  if (carriesPersonalData) {
    return {
      state: "blocked",
      reason: "personal-data",
      answer: PERSONAL_DATA_RESPONSE,
    };
  }

  return null;
}
