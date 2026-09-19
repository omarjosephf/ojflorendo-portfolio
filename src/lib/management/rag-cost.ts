/**
 * Last-known cost inputs for one answered E.V question.
 *
 * Every figure is copied from `docs/assistant-service-costs.md`, dated
 * 2026-08-28, which priced `claude-haiku-4-5`. The assistant has run on
 * `gemini-3.5-flash-lite` since 2026-09-13 (ADR-0015, ADR-0020). The
 * repository's only Gemini figures are a six-call measurement of one question
 * on 2026-09-12 in docs/state/CURRENT.md (published rates US$0.30 and US$2.50
 * per million tokens, about US$0.0024 per answer); that is evidence for a
 * rewrite of the cost document, not a costing, so it is not used here. The
 * authoritative settings live in the `cited` repository. `verifiedOn` is
 * therefore the date these numbers were last true, and the management panel
 * shows it beside the figure rather than presenting the cost as current.
 *
 * `typicalInputTokens` and `typicalOutputTokens` are the document's own
 * estimates for a cited answer (four passages of up to ~512 tokens plus the
 * system prompt and the question; roughly 400 tokens of answer). They are what
 * make the per-question figure reproducible from this file alone.
 */
type RagCostInputs = {
  model: string; inputUsdPerMillionTokens: number; outputUsdPerMillionTokens: number;
  retrievedPassages: number; answerTokenCeiling: number;
  typicalInputTokens: number; typicalOutputTokens: number;
  verifiedOn: `${number}-${number}-${number}`; source: string;
};
export const ragCostInputs = {
  model: "claude-haiku-4-5",
  inputUsdPerMillionTokens: 1.0,
  outputUsdPerMillionTokens: 5.0,
  retrievedPassages: 4,
  answerTokenCeiling: 1024,
  typicalInputTokens: 2500,
  typicalOutputTokens: 400,
  verifiedOn: "2026-08-28",
  source: "docs/assistant-service-costs.md",
} as const satisfies RagCostInputs;
