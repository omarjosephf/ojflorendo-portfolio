/**
 * Build the assistant corpus deployment artifact.
 *
 * This repository owns the corpus; another repository serves it. This script is
 * the only sanctioned way content crosses that boundary — a deterministic,
 * self-describing artifact rather than someone copying a folder and hoping.
 *
 *     node scripts/export-assistant-corpus.mjs <destination>
 *
 * It writes:
 *
 *     <destination>/
 *     ├── CHECKSUM             the corpus digest
 *     ├── content/             the corpus documents
 *     └── system-prompt.md     this deployment's system prompt
 *
 * BE PRECISE ABOUT WHAT THE CHECKSUM BUYS. It catches the realistic failures —
 * a stale copy, a partial copy, a corrupted transfer, a document edited on the
 * serving side — because the service recomputes the digest at startup and
 * refuses to run on a mismatch. It is not an independent witness: a digest that
 * travels with the corpus it describes cannot detect both being replaced
 * together. For that, record the checksum this script prints in the release
 * notes and compare it against what the deployed `/health` reports.
 *
 * The destination is emptied of previous corpus documents before writing, so a
 * document deleted here does not survive in the artifact. That deletion is the
 * one operation in this script that removes files, and it is confined to the
 * artifact's own `content/` directory.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  corpusChecksum,
  corpusFilePaths,
} from "../src/lib/assistant/corpus-checksum.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpusDir = join(root, "content", "assistant");
const promptPath = join(root, "content", "assistant-system-prompt.md");

const destination = process.argv[2];
if (!destination) {
  console.error(
    "Usage: node scripts/export-assistant-corpus.mjs <destination>\n\n" +
      "Example, exporting into the serving repository's staging area:\n" +
      "  node scripts/export-assistant-corpus.mjs ../oj-doc-assistant/deploy/oj-assistant",
  );
  process.exit(1);
}

const target = resolve(destination);
const targetContent = join(target, "content");

// Refuse to write somewhere that already holds something other than a previous
// artifact. The script deletes files, and the guard is what stops a mistyped
// path from deleting the wrong ones.
if (existsSync(target)) {
  const unexpected = readdirSync(target).filter(
    (entry) => !["CHECKSUM", "content", "system-prompt.md"].includes(entry),
  );
  if (unexpected.length > 0) {
    console.error(
      `Refusing to write to ${target}: it contains files that are not part of ` +
        `an exported artifact (${unexpected.join(", ")}).\n` +
        "Point at an empty directory, or at a previous artifact.",
    );
    process.exit(1);
  }
}

if (!existsSync(promptPath)) {
  console.error(`Missing system prompt: ${promptPath}`);
  process.exit(1);
}

const paths = corpusFilePaths(corpusDir);
if (paths.length === 0) {
  // An empty artifact would deploy a service that starts and answers nothing.
  console.error(`No corpus documents found in ${corpusDir}`);
  process.exit(1);
}

// Clear only previously exported documents, so a document deleted from the
// corpus is genuinely gone from the artifact rather than lingering as content
// nobody reviewed but the service still serves.
rmSync(targetContent, { recursive: true, force: true });
mkdirSync(targetContent, { recursive: true });

for (const path of paths) {
  const from = join(corpusDir, ...path.split("/"));
  const to = join(targetContent, ...path.split("/"));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

copyFileSync(promptPath, join(target, "system-prompt.md"));

// Computed from the artifact that was just written, not from the source. If the
// copy went wrong, this is where it shows — the artifact describes itself.
const checksum = corpusChecksum(targetContent);
writeFileSync(join(target, "CHECKSUM"), `${checksum}\n`, "utf8");

const sourceChecksum = corpusChecksum(corpusDir);
if (checksum !== sourceChecksum) {
  console.error(
    `Artifact does not match the source corpus.\n` +
      `  source:   ${sourceChecksum}\n  artifact: ${checksum}\n` +
      "The copy is incomplete or altered. Do not deploy this.",
  );
  process.exit(1);
}

const bytes = paths.reduce(
  (total, path) => total + statSync(join(corpusDir, ...path.split("/"))).size,
  0,
);

console.log(`Exported ${paths.length} documents (${(bytes / 1024).toFixed(1)} KiB)`);
console.log(`  to        ${target}${sep}`);
console.log(`  checksum  ${checksum}`);
console.log("");
console.log("Record that checksum in the release notes, then verify the deployed");
console.log("service reports the same prefix from GET /health.");
