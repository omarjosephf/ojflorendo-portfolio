import {
  assistantKnowledge,
  type AssistantKnowledgeEntry,
  type AssistantLink,
} from "@/data/assistant-knowledge";

export const ASSISTANT_INPUT_LIMIT = 280;

export type AssistantResultStatus =
  | "matched"
  | "unknown"
  | "refused"
  | "privacy";

export interface AssistantResult {
  readonly status: AssistantResultStatus;
  readonly title: string;
  readonly answer: string;
  readonly links: readonly AssistantLink[];
}

const blockedRequestPatterns: readonly RegExp[] = [
  /\b(system|developer)\s+(prompt|message|instruction)s?\b/i,
  /\b(hidden|internal)\s+(prompt|instruction|rule|file|document)s?\b/i,
  /\b(ignore|override|bypass|forget)\b.{0,40}\b(instruction|rule|policy|prompt)s?\b/i,
  /\b(environment\s+variables?|env\s+vars?|api\s*keys?|access\s*tokens?|passwords?|secrets?)\b/i,
  /\b(private\s+(cv|resume|phone|address|document|file|report|repository|repo))\b/i,
  /\b(street\s+address|home\s+address|personal\s+phone)\b/i,
  /\b(unpublished|confidential)\s+(project|client|document|work|information)\b/i,
  /\b(chat\s+transcript|internal\s+chat|private\s+conversation)\b/i,
];

const personalDataPatterns: readonly RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s().-]{8,}\d)/,
  /\b(?:password|passcode|pin|credit\s*card|bank\s*account)\s*[:=]/i,
];

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreEntry(
  query: string,
  entry: AssistantKnowledgeEntry,
): number {
  return entry.keywords.reduce((score, keyword) => {
    const normalisedKeyword = normalise(keyword);
    if (!normalisedKeyword || !query.includes(normalisedKeyword)) return score;
    return score + (normalisedKeyword.includes(" ") ? 5 : 2);
  }, 0);
}

function safeRefusal(): AssistantResult {
  return {
    status: "refused",
    title: "That is outside the public portfolio",
    answer:
      "I cannot provide or speculate about hidden instructions, secrets, private contact details, private documents, unpublished work, confidential clients, or internal project material. I can only help with OJ's reviewed public portfolio content.",
    links: [
      { label: "Explore public information", href: "/#about" },
      { label: "Contact OJ", href: "/#contact" },
    ],
  };
}

function privacyResponse(): AssistantResult {
  return {
    status: "privacy",
    title: "Please protect your privacy",
    answer:
      "Please do not enter personal, confidential, financial, account, or credential information here. This guide does not transmit or persist your text. For a private enquiry, use OJ's contact options instead.",
    links: [{ label: "Go to contact options", href: "/#contact" }],
  };
}

function unknownResponse(): AssistantResult {
  return {
    status: "unknown",
    title: "I do not have an approved answer for that",
    answer:
      "Try asking about OJ's projects, skills, experience, education, services, availability, working approach, or contact options. For anything else, contact OJ directly rather than relying on an unverified answer.",
    links: [
      { label: "Browse the portfolio", href: "/#about" },
      { label: "Contact OJ", href: "/#contact" },
    ],
  };
}

export function answerPortfolioQuestion(rawInput: string): AssistantResult {
  const boundedInput = rawInput.trim().slice(0, ASSISTANT_INPUT_LIMIT);
  if (!boundedInput) return unknownResponse();

  if (blockedRequestPatterns.some((pattern) => pattern.test(boundedInput))) {
    return safeRefusal();
  }

  if (personalDataPatterns.some((pattern) => pattern.test(boundedInput))) {
    return privacyResponse();
  }

  const query = normalise(boundedInput);
  const ranked = assistantKnowledge
    .map((entry) => ({ entry, score: scoreEntry(query, entry) }))
    .sort((left, right) => right.score - left.score);

  // A specific topic always beats a general entry. General entries keep
  // conversational lead-ins as keywords ("tell me about oj"), which also prefix
  // topic questions ("tell me about oj's projects") and would otherwise outscore
  // the topic itself. Fall back to the general entry only when nothing specific
  // matches, so broad questions still get a useful answer.
  const best =
    ranked.find((candidate) => !candidate.entry.general && candidate.score >= 2) ??
    ranked.find((candidate) => candidate.score >= 2);

  if (!best) return unknownResponse();

  return {
    status: "matched",
    title: best.entry.title,
    answer: best.entry.answer,
    links: best.entry.links,
  };
}
