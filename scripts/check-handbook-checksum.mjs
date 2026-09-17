#!/usr/bin/env node
/**
 * Handbook ratification-checksum drift check.
 *
 * docs/adr/0000-handbook-adoption.md records the SHA-256 of the handbook bytes
 * the owner ratified, so that a substituted or silently edited governing
 * document can be detected. Until 17 September 2026 nothing recomputed it.
 *
 * It had already drifted. The handbook was ratified on 8 September at 2969c19
 * and changed four times over the next five days; the ADR still carried the
 * 8 September value, and the divergence was found by hand six days later. Three
 * of those four commits were *compelled* by the handbook's own §30, which
 * docs:check-handbook-gate requires to match package.json and ci.yml — so adding
 * a gate stage forces a handbook edit, and a checksum pinned to a ratification
 * event cannot survive that on good intentions alone. This check makes the
 * divergence fail in the commit that causes it.
 *
 * Line endings are normalised to LF before hashing, and that is not a
 * formality. ADR-0000 already recorded one incident where the ratified value
 * was a CRLF rendering that verified only on Windows: "a verification control
 * whose result depends on the checker's operating system is not a verification
 * control." This repository still reproduces that hazard — .gitattributes sets
 * `*.md text eol=lf` so git stores LF, while a Windows working copy of the
 * handbook is CRLF on disk. Hashing the raw bytes would pass in CI and fail
 * locally on the identical, untampered file.
 *
 * What this proves and what it does not: it proves the ADR and the committed
 * handbook agree. It cannot prove the owner ratified anything. Updating the
 * recorded value is a governance act under §49.6 and §4.1, not a way to make
 * this check go quiet.
 *
 * Exits 0 when the two agree, 1 otherwise.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HANDBOOK = "docs/ENGINEERING_HANDBOOK.md";
const ADR = "docs/adr/0000-handbook-adoption.md";
const MARKER = "Current — the value to verify against";

/** The value ADR-0000 records: the first 64-hex digest after the marker sentence. */
function recordedChecksum() {
  const text = readFileSync(join(repoRoot, ADR), "utf8");
  const markerAt = text.indexOf(MARKER);
  if (markerAt === -1) {
    throw new Error(
      `${ADR} no longer contains the sentence "${MARKER}". That section must ` +
        "introduce the authoritative checksum with that wording so this check can find it.",
    );
  }
  const match = /\b[a-f0-9]{64}\b/.exec(text.slice(markerAt));
  if (!match) {
    throw new Error(
      `${ADR} has no 64-character SHA-256 after "${MARKER}". The authoritative ` +
        "value must follow that sentence.",
    );
  }
  return match[0];
}

/**
 * The handbook's SHA-256 over LF-normalised bytes, which is what `git show
 * <ref>:docs/ENGINEERING_HANDBOOK.md | sha256sum` produces for the committed
 * blob. Untouched when the file is already LF, so the usual path hashes the
 * exact bytes on disk.
 */
function actualChecksum() {
  const raw = readFileSync(join(repoRoot, HANDBOOK));
  const bytes = raw.includes(0x0d)
    ? Buffer.from(raw.toString("utf8").replace(/\r\n/g, "\n"), "utf8")
    : raw;
  return createHash("sha256").update(bytes).digest("hex");
}

const recorded = recordedChecksum();
const actual = actualChecksum();

if (recorded !== actual) {
  console.error("Handbook checksum check FAILED: the governing document does not match its ratification record.\n");
  console.error(`  ${ADR} records : ${recorded}`);
  console.error(`  ${HANDBOOK} is  : ${actual}\n`);
  console.error("One of two things is true, and they need opposite responses:\n");
  console.error("  1. The handbook was changed deliberately and the owner has ratified the new");
  console.error(`     bytes. Update the checksum under "${MARKER}" in ${ADR},`);
  console.error("     in this same commit, and record what changed and why.\n");
  console.error("  2. The handbook was changed without ratification. Do not update the ADR.");
  console.error("     Restore the governing bytes and raise it with the owner.\n");
  console.error("Updating the recorded value is an owner decision (§4.1), not a way to clear this check.");
  process.exit(1);
}

console.log(`Handbook checksum check passed: ${HANDBOOK} matches the value ratified in ${ADR}.`);
console.log(`  ${actual}`);
