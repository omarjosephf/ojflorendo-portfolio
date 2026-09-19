/**
 * Cost inputs for one answered E.V question.
 *
 * Every figure is copied from `docs/assistant-service-costs.md`, rewritten on
 * 2026-09-19 around the deployed `gemini-3.5-flash-lite` runtime. The published
 * rates were checked against Google's pricing page on that date; the
 * per-answer figure is the six-call measurement of 2026-09-12 recorded in
 * `docs/state/CURRENT.md`, not an estimate derived from token counts.
 *
 * `measurementCalls` and `measurementQuestions` are here because the figure is
 * only as good as its sample, and a panel that shows the number without the
 * sample invites more confidence than the evidence carries.
 *
 * `runtimeDeployedOn` is what makes staleness derivable rather than asserted:
 * `costIsStale` compares it with `verifiedOn`, so the panel's caveat appears
 * whenever these figures predate the runtime they claim to describe, and stops
 * appearing when someone re-verifies them. The previous version hardcoded that
 * caveat, which meant it would still have read "no longer the deployed model"
 * after the figures were corrected.
 *
 * The authoritative retrieval settings live in the `cited` repository;
 * `retrievedPassages` and `answerTokenCeiling` are this repository's record of
 * them and can fall behind it.
 */
export type RagCostInputs = {
  model: string; inputUsdPerMillionTokens: number; outputUsdPerMillionTokens: number;
  measuredUsdPerAnswer: number; measuredLowUsdPerAnswer: number; measuredHighUsdPerAnswer: number;
  measurementCalls: number; measurementQuestions: number; measuredOn: `${number}-${number}-${number}`;
  reservationUsdPerAttempt: number; monthlyReservationCeilingUsd: number; monthlyAttemptCeiling: number;
  retrievedPassages: number; answerTokenCeiling: number;
  runtimeDeployedOn: `${number}-${number}-${number}`; verifiedOn: `${number}-${number}-${number}`; source: string;
};
export const ragCostInputs = {
  model: "gemini-3.5-flash-lite",
  inputUsdPerMillionTokens: 0.3,
  outputUsdPerMillionTokens: 2.5,
  measuredUsdPerAnswer: 0.0024,
  measuredLowUsdPerAnswer: 0.0021,
  measuredHighUsdPerAnswer: 0.0027,
  measurementCalls: 6,
  measurementQuestions: 1,
  measuredOn: "2026-09-12",
  reservationUsdPerAttempt: 0.04,
  monthlyReservationCeilingUsd: 2,
  monthlyAttemptCeiling: 200,
  retrievedPassages: 4,
  answerTokenCeiling: 1024,
  runtimeDeployedOn: "2026-09-13",
  verifiedOn: "2026-09-19",
  source: "docs/assistant-service-costs.md",
} as const satisfies RagCostInputs;
/** True when the figures were last verified before the runtime they describe was deployed. */
export function costIsStale(cost: RagCostInputs = ragCostInputs) { return cost.verifiedOn < cost.runtimeDeployedOn; }
/** How many answers the monthly reservation ceiling admits, at a full reservation each. */
export function answersAdmittedPerMonth(cost: RagCostInputs = ragCostInputs) { return Math.min(cost.monthlyAttemptCeiling, Math.floor(cost.monthlyReservationCeilingUsd / cost.reservationUsdPerAttempt)); }
