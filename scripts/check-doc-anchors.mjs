#!/usr/bin/env node
/**
 * Documentation-anchor integrity check.
 *
 * Source comments cite governing rules by section, e.g.
 *   docs/ENGINEERING_HANDBOOK.md §19.1
 *   SECURITY.md, "Dynamic-rendering trade-off"
 *
 * Those citations are the only thread from a line of code back to the rule that
 * constrains it, and nothing stops a heading being renumbered or renamed out
 * from under one. Every anchor cited in the tree is resolved here against the
 * headings that actually exist, so a rename fails CI instead of quietly leaving
 * a reviewer with a pointer to nowhere.
 *
 * Exits 0 when every anchor resolves, 1 otherwise.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Files and directories never scanned for anchors. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".codex",
  ".agents",
  "playwright-report",
  "test-results",
  "public",
]);

/** Extensions scanned for anchor citations. */
const SCAN_EXTENSIONS = [".ts", ".tsx", ".mjs", ".js", ".css", ".md"];

/** Documents whose headings anchors may point at. */
const ANCHOR_TARGETS = ["docs/ENGINEERING_HANDBOOK.md", "SECURITY.md", "README.md"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (SCAN_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Section numbers a Markdown document defines, taken from headings shaped
 * `## 19. Accessibility standard` or `### 19.1 Motion and 3D`.
 */
function sectionNumbers(markdown) {
  const numbers = new Set();
  for (const line of markdown.split("\n")) {
    const match = /^#{1,6}\s+(\d+(?:\.\d+)*)\.?\s+\S/.exec(line);
    if (match) numbers.add(match[1]);
  }
  return numbers;
}

/** Heading titles a Markdown document defines, normalised for comparison. */
function headingTitles(markdown) {
  const titles = new Set();
  for (const line of markdown.split("\n")) {
    const match = /^#{1,6}\s+(.*\S)\s*$/.exec(line);
    if (!match) continue;
    titles.add(normalise(match[1].replace(/^\d+(?:\.\d+)*\.?\s+/, "")));
  }
  return titles;
}

/** Lowercase, collapse whitespace, and fold the dashes and quotes prose uses. */
function normalise(text) {
  return text
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const targets = new Map();
for (const target of ANCHOR_TARGETS) {
  const body = readFileSync(join(repoRoot, target), "utf8");
  targets.set(target, { numbers: sectionNumbers(body), titles: headingTitles(body) });
}

/**
 * Anchors that named a document which no longer carries the structure they cite.
 * `CLAUDE.md §N` and `SECURITY.md, gap GN` were both live conventions once; both
 * documents lost that structure and left every citation dangling. Naming them
 * explicitly turns a silent regression into a failure with a fix in the message.
 */
const RETIRED_PATTERNS = [
  {
    pattern: /CLAUDE\.md\s*(?:§|section\s+)\d/gi,
    message:
      "CLAUDE.md has no numbered sections. Cite docs/ENGINEERING_HANDBOOK.md §N instead.",
  },
  {
    pattern: /gap\s+G\d+/gi,
    message:
      'SECURITY.md has no gap register. Cite the section by name, e.g. SECURITY.md, "Privacy".',
  },
];

const failures = [];

for (const file of walk(repoRoot)) {
  const rel = relative(repoRoot, file).split(sep).join("/");
  if (rel === "scripts/check-doc-anchors.mjs") continue;
  const body = readFileSync(file, "utf8");

  for (const { pattern, message } of RETIRED_PATTERNS) {
    for (const match of body.matchAll(pattern)) {
      failures.push(`${rel}: retired anchor "${match[0]}" — ${message}`);
    }
  }

  for (const [target, { numbers }] of targets) {
    const numeric = new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*§\\s*(\\d+(?:\\.\\d+)*)`, "g");
    for (const match of body.matchAll(numeric)) {
      if (!numbers.has(match[1])) {
        failures.push(`${rel}: ${target} §${match[1]} does not exist.`);
      }
    }
  }

  for (const [target, { titles }] of targets) {
    const named = new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},\\s*[""']([^""'\\n]+)[""']`, "g");
    for (const match of body.matchAll(named)) {
      if (!titles.has(normalise(match[1]))) {
        failures.push(`${rel}: ${target} has no heading "${match[1]}".`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Dangling documentation anchors:\n");
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\n${failures.length} anchor problem(s).`);
  process.exit(1);
}

console.log("Documentation anchors: all references resolve.");
