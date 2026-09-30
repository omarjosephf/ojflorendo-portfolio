import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { LIVE_PHASE_CEILING_MICRO_USD } from "./catalog";

/**
 * Durable, one-way spend ledger shared by every Phase 18.4 run. A call's
 * worst-case cost is written to disk before it is sent; afterwards the entry
 * is settled to the cost Google reported. A crash between the two leaves the
 * full reservation counted, so the ceiling can only ever be over-counted.
 * An unreadable ledger stops every run: it fails closed, never open.
 */

export interface LedgerEntry {
  callId: string;
  runId: string;
  role: string;
  model: string;
  reservedMicroUsd: number;
  /** null until Google's usage is known; the reservation counts meanwhile. */
  actualMicroUsd: number | null;
  reservedAt: string;
  settledAt: string | null;
}

interface LedgerFile {
  kind: "blog-live-spend-ledger";
  version: 1;
  ceilingMicroUsd: number;
  entries: LedgerEntry[];
}

export class SpendLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpendLedgerError";
  }
}

function committed(entry: LedgerEntry) {
  return entry.actualMicroUsd ?? entry.reservedMicroUsd;
}

export class SpendLedger {
  constructor(
    private readonly path: string,
    private readonly ceilingMicroUsd = LIVE_PHASE_CEILING_MICRO_USD,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private read(): LedgerFile {
    if (!existsSync(this.path)) {
      return { kind: "blog-live-spend-ledger", version: 1, ceilingMicroUsd: this.ceilingMicroUsd, entries: [] };
    }
    let parsed: LedgerFile;
    try {
      parsed = JSON.parse(readFileSync(this.path, "utf8")) as LedgerFile;
    } catch {
      throw new SpendLedgerError("The spend ledger is unreadable; no call may be made until the owner checks it.");
    }
    if (
      parsed?.kind !== "blog-live-spend-ledger" ||
      parsed.version !== 1 ||
      parsed.ceilingMicroUsd !== this.ceilingMicroUsd ||
      !Array.isArray(parsed.entries)
    ) {
      throw new SpendLedgerError("The spend ledger does not match the approved ceiling.");
    }
    return parsed;
  }

  private write(file: LedgerFile) {
    writeFileSync(this.path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  }

  totalMicroUsd() {
    return this.read().entries.reduce((sum, entry) => sum + committed(entry), 0);
  }

  runTotalMicroUsd(runId: string) {
    return this.read()
      .entries.filter((entry) => entry.runId === runId)
      .reduce((sum, entry) => sum + committed(entry), 0);
  }

  reserve(entry: Omit<LedgerEntry, "actualMicroUsd" | "reservedAt" | "settledAt">, runCeilingMicroUsd: number) {
    if (!Number.isSafeInteger(entry.reservedMicroUsd) || entry.reservedMicroUsd <= 0) {
      throw new SpendLedgerError("A reservation must be a positive whole number of micro-USD.");
    }
    const file = this.read();
    if (file.entries.some((existing) => existing.callId === entry.callId)) {
      throw new SpendLedgerError("A call id can be reserved only once.");
    }
    const total = file.entries.reduce((sum, existing) => sum + committed(existing), 0);
    const runTotal = file.entries
      .filter((existing) => existing.runId === entry.runId)
      .reduce((sum, existing) => sum + committed(existing), 0);
    if (runTotal + entry.reservedMicroUsd > runCeilingMicroUsd) {
      throw new SpendLedgerError("This call could exceed the per-run ceiling, so it was not sent.");
    }
    if (total + entry.reservedMicroUsd > this.ceilingMicroUsd) {
      throw new SpendLedgerError("This call could exceed the Phase 18.4 spend ceiling, so it was not sent.");
    }
    file.entries.push({ ...entry, actualMicroUsd: null, reservedAt: this.now().toISOString(), settledAt: null });
    this.write(file);
  }

  /** Records Google's reported cost. A cost above the reservation is kept, never trimmed. */
  settle(callId: string, actualMicroUsd: number) {
    if (!Number.isSafeInteger(actualMicroUsd) || actualMicroUsd < 0) {
      throw new SpendLedgerError("A settled cost must be a whole, non-negative number of micro-USD.");
    }
    const file = this.read();
    const entry = file.entries.find((existing) => existing.callId === callId);
    if (!entry || entry.actualMicroUsd !== null) {
      throw new SpendLedgerError("Only an open reservation can be settled.");
    }
    entry.actualMicroUsd = actualMicroUsd;
    entry.settledAt = this.now().toISOString();
    this.write(file);
    return actualMicroUsd > entry.reservedMicroUsd;
  }
}
