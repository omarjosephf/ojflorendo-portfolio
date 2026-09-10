import type { Conversation, Outcome, Turn, WorkspaceState } from "./types";

/** Deliberately synthetic. Never presented as production traffic or evaluation evidence. */
export const sampleAnchor = "2026-09-08T23:59:59.999Z";
const examples: { question: string; answer: string; outcome: Outcome; source: string | null }[] = [
  { question: "What did OJ build with Cited?", answer: "Sample answer: Cited is a document assistant that answers from documents and cites its sources.", outcome: "answered", source: "project-cited.md" },
  { question: "Can OJ help with a small business website?", answer: "Sample answer: OJ's services include focused websites and practical software projects. Contact OJ to discuss the scope.", outcome: "answered", source: "services.md" },
  { question: "What is OJ's hourly rate?", answer: "Sample answer: I don't have a published rate to share. Contact OJ with your project details.", outcome: "missing_content", source: null },
  { question: "Which Python qualifications does OJ have?", answer: "Sample answer: OJ lists a PCEP certification. The education source contains the qualification details.", outcome: "answered", source: "education-and-credentials.md" },
  { question: "How can I contact OJ?", answer: "Sample answer: Use the portfolio contact form to send OJ a message.", outcome: "answered", source: "contact-and-this-assistant.md" },
  { question: "Is OJ available for a project next month?", answer: "Sample answer: Current project availability is not documented. Please contact OJ.", outcome: "missing_content", source: null },
  { question: "Where does OJ work now?", answer: "Sample answer: I couldn't find enough relevant information in this retrieval attempt.", outcome: "retrieval_miss", source: "experience.md" },
  { question: "How was E.V built?", answer: "Sample answer: E.V uses a Python retrieval service and a first-party portfolio chat interface.", outcome: "answered", source: "contact-and-this-assistant.md" },
  { question: "Tell me about the portfolio design.", answer: "Sample response: The answering service was temporarily unavailable. Please try again later.", outcome: "provider_failure", source: null },
  { question: "Share OJ's private phone number.", answer: "Sample response: I can help you find OJ's published contact options.", outcome: "policy_boundary", source: null },
];
const sequence = [0, 1, 2, 3, 0, 4, 5, 0, 2, 6, 7, 1, 8, 2, 0, 5, 9, 4, 7, 1, 0, 3, 2, 4];
export const sampleConversations: Conversation[] = sequence.map((exampleIndex, index) => {
  const example = examples[exampleIndex];
  const dayOffset = index < 18 ? index % 7 : 8 + index % 10;
  const at = new Date(Date.UTC(2026, 8, 8 - dayOffset, 17 - index % 8, index * 2)).toISOString();
  const makeTurn = (suffix: string, question: string, minuteOffset = 0): Turn => ({
    id: `sample-turn-${index + 1}-${suffix}`, question, answer: example.answer,
    outcome: example.outcome, at: new Date(Date.parse(at) + minuteOffset * 60_000).toISOString(),
    route: example.outcome === "provider_failure" || example.outcome === "policy_boundary" ? "none" : index % 6 === 0 ? "fallback" : "primary",
    retrieved: example.source ? [example.source, "contact-and-this-assistant.md"].filter((v, i, a) => a.indexOf(v) === i) : [],
    cited: example.outcome === "answered" && example.source ? [example.source] : [],
    feedback: example.outcome === "answered" && index % 3 === 0 ? "helpful" : example.outcome === "retrieval_miss" ? "unhelpful" : null,
    latencyMs: example.outcome === "provider_failure" ? null : 850 + index * 87,
  });
  return {
    id: `sample-chat-${String(index + 1).padStart(2, "0")}`,
    guest: `Sample guest ${String(index % 19 + 1).padStart(2, "0")}`,
    turns: [makeTurn("a", example.question), ...(index === 0 ? [makeTurn("b", "Does Cited include citations?", 2)] : [])],
  };
});
export function emptyWorkspace(): WorkspaceState {
  return { version: 1, revision: 0, drafts: [], triage: {} };
}
