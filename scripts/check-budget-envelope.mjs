#!/usr/bin/env node
/**
 * Capture reservation envelope consistency check.
 *
 * Before it dispatches anything, the paid capture demands room for two attempts
 * per case — `cli.py`: `maximum = 2 * len(questions)`. That number is derived
 * from the question set at run time and compared against a ledger sized by hand
 * in ADR-0015. Nothing kept the two in step.
 *
 * On 13 September 2026 they were out of step by exactly a factor of two: the
 * suite had grown to 75 questions, needing 150 attempts of headroom, while the
 * service envelope the capture inherits admits at most 40 and its money limits
 * bind first at 10. The capture could not start, and `release_manifest.py` will
 * not accept a partial run in place of a complete one. None of that was visible
 * until an owner-approved paid run was attempted.
 *
 * This moves the arithmetic into CI, so a question set that outgrows the
 * approved envelope costs a red build instead of a blocked release step.
 *
 * Exits 0 when the envelope still covers the suite, 1 otherwise.
 */
import { readFile } from "node:fs/promises";

const ADR = "docs/adr/0015-durable-budget-and-provider-order.md";
const QUESTIONS = "content/assistant-eval/questions.toml";
const ATTEMPTS_PER_CASE = 2;

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const problems = [];

const adr = await read(ADR);
const declared = adr.match(/at (\d+) attempts and US\$([\d.]+) daily and monthly reservation/);
if (!declared) {
  problems.push(
    `${ADR} no longer states the capture envelope in the expected form.\n` +
      `    expected a sentence like "at 150 attempts and US$6.00 daily and monthly reservation"`,
  );
} else {
  const envelope = Number(declared[1]);
  const questions = (await read(QUESTIONS)).match(/^\[\[question\]\]\r?$/gmu)?.length ?? 0;
  const required = questions * ATTEMPTS_PER_CASE;
  if (questions === 0) {
    problems.push(`${QUESTIONS} parsed as zero questions; the [[question]] format has changed.`);
  } else if (envelope < required) {
    problems.push(
      `The capture envelope no longer covers the question set.\n` +
        `    ${QUESTIONS}: ${questions} questions\n` +
        `    capture needs: ${required} attempts (${ATTEMPTS_PER_CASE} per case, cli.py)\n` +
        `    ${ADR} allows: ${envelope} attempts\n` +
        `    Raise the envelope in ADR-0015 and the settings bounds in omarjosephf/cited,\n` +
        `    or reduce the suite. A paid capture cannot start until these agree.`,
    );
  }
}

if (problems.length > 0) {
  console.error(`Budget envelope check failed:\n\n${problems.join("\n\n")}\n`);
  process.exit(1);
}
console.log("Budget envelope check passed.");
