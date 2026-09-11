#!/usr/bin/env node
/**
 * Handbook quality-gate drift check.
 *
 * docs/ENGINEERING_HANDBOOK.md §30 states the composite gate a release must
 * pass. That statement is only useful while it matches the commands `test:ci`
 * actually runs, and nothing stops a stage being added to package.json without
 * the handbook following. On 11 September 2026 the two had already diverged:
 * the handbook listed seven stages where the gate ran twelve, so five required
 * checks — documentation anchors, corpus identity, the management SQL and
 * restore suites, and the management browser suite — were absent from the rule
 * that governs them.
 *
 * The ordered stage list is parsed from both sources and compared here, so a
 * change to one without the other fails the gate instead of quietly leaving the
 * handbook describing a gate that no longer exists.
 *
 * Exits 0 when the two agree, 1 otherwise.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HANDBOOK = "docs/ENGINEERING_HANDBOOK.md";
const MARKER = "Its sequence is exactly the following";

/** Stages as package.json runs them: `test:ci` split on its `&&` separators. */
function stagesFromPackageJson() {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const script = pkg.scripts?.["test:ci"];
  if (!script) throw new Error("package.json has no test:ci script");
  return script
    .split("&&")
    .map((stage) => stage.trim())
    .filter(Boolean);
}

/** Stages as the handbook documents them: the fenced block introduced by MARKER. */
function stagesFromHandbook() {
  const text = readFileSync(join(repoRoot, HANDBOOK), "utf8");
  const markerAt = text.indexOf(MARKER);
  if (markerAt === -1) {
    throw new Error(
      `${HANDBOOK} no longer contains the sentence "${MARKER}". ` +
        "§30 must introduce its stage list with that wording so this check can find it.",
    );
  }
  const open = text.indexOf("```bash", markerAt);
  const close = text.indexOf("```", open + 7);
  if (open === -1 || close === -1) {
    throw new Error(`${HANDBOOK} §30 has no fenced bash block after the stage-list sentence.`);
  }
  return text
    .slice(open + 7, close)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

let actual;
let documented;
try {
  actual = stagesFromPackageJson();
  documented = stagesFromHandbook();
} catch (error) {
  console.error(`Handbook gate check could not run: ${error.message}`);
  process.exit(1);
}

const differences = [];
for (let i = 0; i < Math.max(actual.length, documented.length); i += 1) {
  if (actual[i] !== documented[i]) {
    differences.push({ position: i + 1, handbook: documented[i], packageJson: actual[i] });
  }
}

if (differences.length > 0) {
  console.error(`Handbook gate drift: ${HANDBOOK} §30 does not match package.json test:ci.\n`);
  for (const { position, handbook, packageJson } of differences) {
    console.error(`  stage ${position}`);
    console.error(`    handbook:     ${handbook ?? "(absent)"}`);
    console.error(`    package.json: ${packageJson ?? "(absent)"}`);
  }
  console.error(
    `\n${documented.length} stage(s) documented, ${actual.length} actually run.` +
      "\nUpdate whichever source is wrong. The handbook must describe the gate that runs.",
  );
  process.exit(1);
}

console.log(`Handbook gate check passed: §30 and test:ci agree on all ${actual.length} stages.`);
