import { BlogWorkflowFault } from "./errors";
import type { BlogModelStage, BudgetSnapshot } from "./types";

interface Reservation {
  amountMicroUsd: number;
  stage: BlogModelStage;
}

function validMoney(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Per-run admission ledger. It is deliberately in-memory in Phase 18.2 because
 * saved fixtures are the only adapter and no money can be spent. A live adapter
 * requires a separately approved durable implementation in a later phase.
 */
export class RunCostBudget {
  readonly ceilingMicroUsd: number;
  private readonly reservations = new Map<string, Reservation>();
  private committedMicroUsd = 0;
  private reportedActualMicroUsd = 0;

  constructor(ceilingMicroUsd: number) {
    if (!Number.isSafeInteger(ceilingMicroUsd) || ceilingMicroUsd < 1) {
      throw new BlogWorkflowFault(
        "invalid-budget-ceiling",
        "configuration",
        "The run cost ceiling must be a positive integer number of micro-USD.",
      );
    }
    this.ceilingMicroUsd = ceilingMicroUsd;
  }

  reserve(callId: string, stage: BlogModelStage, amountMicroUsd: number) {
    if (!validMoney(amountMicroUsd)) {
      throw new BlogWorkflowFault(
        "invalid-cost-reservation",
        stage,
        "The model adapter returned an invalid cost reservation.",
      );
    }
    if (this.reservations.has(callId)) {
      throw new BlogWorkflowFault(
        "duplicate-cost-reservation",
        stage,
        "The model call attempted to reuse a cost reservation identifier.",
      );
    }

    const active = [...this.reservations.values()].reduce(
      (sum, reservation) => sum + reservation.amountMicroUsd,
      0,
    );
    if (this.committedMicroUsd + active + amountMicroUsd > this.ceilingMicroUsd) {
      throw new BlogWorkflowFault(
        "run-budget-exhausted",
        stage,
        "The next model call cannot be reserved within the approved run ceiling.",
      );
    }
    this.reservations.set(callId, { amountMicroUsd, stage });
  }

  settle(callId: string, actualMicroUsd: number) {
    const reservation = this.requireReservation(callId);
    if (!validMoney(actualMicroUsd)) {
      this.forfeit(callId);
      throw new BlogWorkflowFault(
        "invalid-reported-cost",
        reservation.stage,
        "The model adapter returned invalid cost metadata.",
      );
    }

    this.reservations.delete(callId);
    this.reportedActualMicroUsd += actualMicroUsd;
    // A dispatched reservation is one-way authority for this run. Even when an
    // adapter reports a lower actual cost, the difference is not recycled into
    // another call. That keeps admission independent of optimistic metadata.
    this.committedMicroUsd += Math.max(actualMicroUsd, reservation.amountMicroUsd);
    if (actualMicroUsd > reservation.amountMicroUsd) {
      throw new BlogWorkflowFault(
        "cost-reservation-exceeded",
        reservation.stage,
        "The model call exceeded its pre-dispatch cost reservation.",
      );
    }
  }

  /**
   * Unknown or unusable responses consume the whole reservation. The workflow
   * cannot assume a provider refunded a failed/lost acknowledgement.
   */
  forfeit(callId: string, reportedActualMicroUsd = 0) {
    const reservation = this.requireReservation(callId);
    if (validMoney(reportedActualMicroUsd)) {
      this.reportedActualMicroUsd += reportedActualMicroUsd;
    }
    this.committedMicroUsd += Math.max(reservation.amountMicroUsd, reportedActualMicroUsd);
    this.reservations.delete(callId);
  }

  snapshot(): BudgetSnapshot {
    const reservedMicroUsd = [...this.reservations.values()].reduce(
      (sum, reservation) => sum + reservation.amountMicroUsd,
      0,
    );
    return {
      ceilingMicroUsd: this.ceilingMicroUsd,
      reservedMicroUsd,
      committedMicroUsd: this.committedMicroUsd,
      reportedActualMicroUsd: this.reportedActualMicroUsd,
      remainingMicroUsd: Math.max(
        0,
        this.ceilingMicroUsd - this.committedMicroUsd - reservedMicroUsd,
      ),
    };
  }

  private requireReservation(callId: string) {
    const reservation = this.reservations.get(callId);
    if (!reservation) {
      throw new BlogWorkflowFault(
        "missing-cost-reservation",
        "configuration",
        "The model call has no active cost reservation.",
      );
    }
    return reservation;
  }
}
