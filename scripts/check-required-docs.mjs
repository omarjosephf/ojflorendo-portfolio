#!/usr/bin/env node
/**
 * Required-documentation existence check.
 *
 * docs/ENGINEERING_HANDBOOK.md §38 lists the documents the repository must
 * maintain, and lists most of them by path. Nothing checked that those paths
 * resolve. On 17 September 2026 three of the four runbooks it names were not
 * there: `docs/runbooks/deployment.md` and `docs/runbooks/security-incident.md`
 * were genuinely absent, and §38 asked for `docs/runbooks/contact-delivery.md`
 * when the file doing that job was `contact-email-delivery.md`. §34 step 7 had
 * been assuming the deployment runbook existed for as long as it did not.
 *
 * All three were resolved the same day — two runbooks written, the third
 * corrected in §38, which changed the handbook's bytes and so required the owner
 * to re-ratify the checksum in docs/adr/0000-handbook-adoption.md. That is why
 * this runs as a required stage rather than as a standing red mark.
 *
 * `docs:check-anchors` could not catch this. That check resolves section
 * citations such as `docs/ENGINEERING_HANDBOOK.md §19.1` against the headings
 * that exist; §38's entries are backticked paths, not section anchors, so
 * nothing ever looked at them.
 *
 * The comparison runs one way only. §38 is a minimum, not an inventory: a
 * runbook that exists without being named there is not a failure, and
 * docs/runbooks/ legitimately carries more files than §38 lists.
 *
 * The list is read out of the handbook rather than restated here. A second copy
 * of §38 inside this script would be one more thing to forget, which is the bug
 * class the check exists to close.
 *
 * Exits 0 when every path §38 names resolves, 1 otherwise.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const HANDBOOK = "docs/ENGINEERING_HANDBOOK.md";
const SECTION = "## 38.";
const MARKER = "The repository should maintain:";

/**
 * The bullet lines of §38's list, taken from the handbook itself.
 *
 * Throws rather than returning nothing when the section or its introducing
 * sentence has moved: a parser that silently matches zero entries and exits 0
 * is worse than no check at all.
 */
function requiredEntries() {
  const text = readFileSync(join(repoRoot, HANDBOOK), "utf8");

  const sectionAt = text.indexOf(SECTION);
  if (sectionAt === -1) {
    throw new Error(
      `${HANDBOOK} no longer has a section beginning "${SECTION}". ` +
        "The required-documentation list must stay at §38 so this check can find it.",
    );
  }

  const nextHeadingAt = text.indexOf("\n## ", sectionAt + SECTION.length);
  const section = text.slice(sectionAt, nextHeadingAt === -1 ? undefined : nextHeadingAt);

  const markerAt = section.indexOf(MARKER);
  if (markerAt === -1) {
    throw new Error(
      `${HANDBOOK} §38 no longer contains the sentence "${MARKER}". ` +
        "§38 must introduce its list with that wording so this check can find it.",
    );
  }

  const entries = [];
  let started = false;
  for (const raw of section.slice(markerAt + MARKER.length).split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("- ")) {
      if (started) break;
      continue;
    }
    started = true;
    entries.push(line.slice(2));
  }

  if (entries.length === 0) {
    throw new Error(`${HANDBOOK} §38 has no bullet list after "${MARKER}".`);
  }
  return entries;
}

/**
 * The path an entry names, or null when it names none.
 *
 * Some entries are deliberately prose — "release notes or changelog" names no
 * single file. A backticked token carrying whitespace is prose too, not a path.
 */
function pathFrom(entry) {
  const match = /`([^`]+)`/.exec(entry);
  if (!match) return null;
  const token = match[1];
  return /\s/.test(token) ? null : token;
}

/** Whether a path resolves, as the kind of thing §38 writes it as. */
function resolves(path) {
  try {
    const stat = statSync(join(repoRoot, path));
    return path.endsWith("/") ? stat.isDirectory() : stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Existing files whose names overlap a missing one.
 *
 * This separates the two failures that read identically in a bare "not found":
 * a naming drift, where the document exists under another name, and a genuine
 * absence, where nobody wrote it.
 */
function neighbours(path) {
  const directory = dirname(join(repoRoot, path));
  let existing;
  try {
    existing = readdirSync(directory);
  } catch {
    return [];
  }
  const wanted = basename(path, extname(path))
    .toLowerCase()
    .split(/[-_.]/)
    .filter((token) => token.length >= 4);
  return existing.filter((name) => {
    const stem = basename(name, extname(name)).toLowerCase();
    return stem !== basename(path, extname(path)).toLowerCase() && wanted.some((token) => stem.includes(token));
  });
}

let entries;
try {
  entries = requiredEntries();
} catch (error) {
  console.error(`Required-documentation check could not run: ${error.message}`);
  process.exit(1);
}

const paths = entries.map(pathFrom).filter((path) => path !== null);
const prose = entries.length - paths.length;
const missing = paths.filter((path) => !resolves(path));

if (missing.length > 0) {
  console.error(`Required-documentation drift: ${HANDBOOK} §38 names paths that do not exist.\n`);
  for (const path of missing) {
    const similar = neighbours(path);
    console.error(`  - ${path}`);
    if (similar.length > 0) {
      console.error(`      not found, but ${dirname(path)}/ holds: ${similar.join(", ")}`);
      console.error("      a naming drift: correct §38, or rename the file it means.");
    } else {
      console.error(`      not found, and nothing in ${dirname(path)}/ resembles it.`);
      console.error("      genuinely absent: write it, or amend §38 to stop requiring it.");
    }
  }
  console.error(
    `\n${missing.length} of ${paths.length} path(s) named in §38 do not resolve.` +
      "\nA handbook that names a document nobody wrote reads as a document that exists." +
      `\nNote that editing §38 changes the handbook's bytes, so ADR-0000's recorded` +
      "\nchecksum must be updated in the same commit — docs:check-handbook-checksum" +
      "\nis stage 4 of the required gate.",
  );
  process.exit(1);
}

console.log(
  `Required-documentation check passed: all ${paths.length} paths named in ${HANDBOOK} §38 resolve` +
    `${prose > 0 ? ` (${prose} prose entr${prose === 1 ? "y" : "ies"} name${prose === 1 ? "s" : ""} no single file)` : ""}.`,
);
