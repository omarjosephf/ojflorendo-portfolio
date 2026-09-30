/** @vitest-environment node */

import { describe, expect, it } from "vitest";

import { RunCostBudget } from "./budget";

describe("RunCostBudget", () => {
  it("commits the whole pre-dispatch reservation instead of recycling optimistic headroom", () => {
    const budget = new RunCostBudget(1_000);
    budget.reserve("call-1", "research", 600);
    budget.settle("call-1", 125);

    expect(budget.snapshot()).toEqual({
      ceilingMicroUsd: 1_000,
      reservedMicroUsd: 0,
      committedMicroUsd: 600,
      reportedActualMicroUsd: 125,
      remainingMicroUsd: 400,
    });
    expect(() => budget.reserve("call-2", "draft", 401)).toThrow(/approved run ceiling/);
  });

  it("forfeits a failed call reservation while retaining a known reported cost", () => {
    const budget = new RunCostBudget(1_000);
    budget.reserve("call-1", "research", 500);
    budget.forfeit("call-1", 90);

    expect(budget.snapshot()).toMatchObject({
      committedMicroUsd: 500,
      reportedActualMicroUsd: 90,
      remainingMicroUsd: 500,
    });
  });
});
