/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { corpusFilePaths } from "@/lib/assistant/corpus-checksum";

type EvaluationQuestion = {
  text: string;
  answerable: boolean;
  critical: boolean;
  expects?: string;
};

/**
 * Read the four integrity fields in the evaluation set's single-line authoring
 * format. Unsupported syntax fails rather than silently skipping a question.
 * This is not a general TOML parser or an answering/retrieval evaluation; the
 * Cited harness remains authoritative for full TOML and history validation.
 */
function questionsFrom(text: string): EvaluationQuestion[] {
  const blocks = text.replace(/\r\n/g, "\n").split(/^\s*\[\[question\]\]\s*(?:#.*)?$/m).slice(1);
  if (!blocks.length) throw new Error("Evaluation set contains no questions");
  return blocks.map((block, index) => {
    function field(key: string): unknown {
      const lines = block.split("\n").filter((line) => new RegExp(`^\\s*${key}\\s*=`).test(line));
      if (!lines.length) return undefined;
      if (lines.length !== 1) throw new Error(`Question ${index + 1}: duplicate ${key}`);
      const value = /^\s*\w+\s*=\s*("(?:[^"\\]|\\.)*"|true|false)\s*(?:#.*)?$/.exec(lines[0])?.[1];
      if (!value) throw new Error(`Question ${index + 1}: unsupported ${key} syntax`);
      return JSON.parse(value) as unknown;
    }
    const question = field("text"), answerable = field("answerable"), critical = field("critical"), expects = field("expects");
    if (typeof question !== "string" || !question.trim()) throw new Error(`Question ${index + 1}: missing text`);
    if (typeof answerable !== "boolean") throw new Error(`${question}: missing boolean answerable`);
    if (critical !== undefined && typeof critical !== "boolean") throw new Error(`${question}: invalid critical`);
    if (expects !== undefined && (typeof expects !== "string" || !expects.trim())) throw new Error(`${question}: invalid expects`);
    return { text: question, answerable, critical: critical ?? false, expects };
  });
}

function integrityErrors(questions: EvaluationQuestion[], headings: string[]): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  for (const heading of headings) {
    if (names.has(heading)) errors.push(`Duplicate corpus heading: ${heading}`);
    names.add(heading);
  }
  for (const question of questions) {
    if (question.critical && !question.answerable) errors.push(`${question.text}: critical requires answerable`);
    if (question.answerable && !question.expects) errors.push(`${question.text}: answerable requires expects`);
    if (!question.answerable && question.expects) errors.push(`${question.text}: unanswerable must not name expects`);
    if (question.expects && !names.has(question.expects)) errors.push(`${question.text}: unknown expected heading ${question.expects}`);
  }
  return errors;
}

const corpusDirectory = join(process.cwd(), "content/assistant");
const headings = corpusFilePaths(corpusDirectory).filter((file) => file.endsWith(".md"))
  .flatMap((file) => [...readFileSync(join(corpusDirectory, file), "utf8").matchAll(/^#{1,6}\s+(.+)$/gm)]
    .map((match) => match[1].trim().replace(/\s+/g, " ")));
const questions = questionsFrom(readFileSync(join(process.cwd(), "content/assistant-eval/questions.toml"), "utf8"));

describe("assistant evaluation-set integrity", () => {
  it("keeps critical flags and expected sources executable and unambiguous", () => {
    expect(questions.length).toBeGreaterThan(0);
    expect(integrityErrors(questions, headings)).toEqual([]);
  });

  it("rejects the released critical-but-unanswerable regression", () => {
    // The fixture reproduces the invalid flag combination independently of copy.
    const fixture = { text: "Name the paying clients", answerable: false, critical: false };
    expect(integrityErrors([{ ...fixture, critical: true }], headings)).toContain(`${fixture.text}: critical requires answerable`);
  });

  it.each([
    [{ text: "Supported?", answerable: true, critical: false }, [], "answerable requires expects"],
    [{ text: "Supported?", answerable: true, critical: false, expects: "Renamed" }, ["Original"], "unknown expected heading"],
    [{ text: "Unsupported?", answerable: false, critical: false, expects: "Source" }, ["Source"], "unanswerable must not name expects"],
  ] satisfies [EvaluationQuestion, string[], string][])("rejects invalid question/source contracts: %j", (question, names, error) => {
    expect(integrityErrors([question], names).join("\n")).toContain(error);
  });

  it("rejects duplicate headings even if no question currently names them", () => {
    expect(integrityErrors([], ["Same", "Same"])).toEqual(["Duplicate corpus heading: Same"]);
  });

  it.each([
    "[[question]]\ntext = \"Question\"\nanswerable = true\ncritical = true\ncritical = false",
    "[[question]]\ntext = \"Question\"\nanswerable = \"false\"",
    "[[question]]\ntext = \"Question\"\nanswerable = maybe",
    "# No question tables",
  ])("fails closed on malformed integrity fields", (text) => {
    expect(() => questionsFrom(text)).toThrow();
  });
});
