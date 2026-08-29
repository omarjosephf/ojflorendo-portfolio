/**
 * Regenerate the derived record of the assistant corpus.
 *
 * The corpus documents are the source of truth. This writes down what they
 * currently hash to, so the checked-in repository carries a statement of which
 * corpus was reviewed — and so `assistant-corpus.generated.test.ts` can fail the
 * gate when the files and that statement disagree.
 *
 * The point is narrow and worth being precise about: this does not *protect* the
 * corpus. It makes an unreviewed change to it impossible to miss. A document
 * edited without running this script fails the build; a document edited and then
 * regenerated shows up as a changed digest in the diff, where a reviewer sees it.
 *
 *     node scripts/build-assistant-corpus.mjs           # write
 *     node scripts/build-assistant-corpus.mjs --check   # verify only, no write
 *
 * The checksum implementation is imported rather than reimplemented: Node 24
 * strips types natively, so the script and the application share one algorithm.
 * A second copy here would be a third implementation to keep in step with the
 * Python one, which is how cross-language contracts quietly stop holding.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  corpusChecksum,
  corpusFileDigests,
} from "../src/lib/assistant/corpus-checksum.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpusDir = join(root, "content", "assistant");
const outputPath = join(root, "src", "data", "assistant-corpus.generated.ts");

function render() {
  const digests = corpusFileDigests(corpusDir);
  const checksum = corpusChecksum(corpusDir);

  const files = digests
    .map(({ path, digest }) => `  { path: ${JSON.stringify(path)}, digest: "${digest}" },`)
    .join("\n");

  return `// GENERATED FILE — do not edit by hand.
//
// Written by \`npm run assistant:build-corpus\` from the documents in
// \`content/assistant/\`. Those documents are the source of truth; this file
// records what they hashed to when they were last reviewed.
//
// If the gate fails here, the corpus changed without this being regenerated.
// Run the script, then read the digest diff — it is the review surface for a
// change to OJ's public claims.

export interface AssistantCorpusFile {
  readonly path: string;
  readonly digest: string;
}

/** Per-file digests, path-sorted. Lets a mismatch be localised to one document. */
export const assistantCorpusFiles: readonly AssistantCorpusFile[] = [
${files}
];

/**
 * The digest identifying this exact corpus.
 *
 * The serving deployment is given this value and refuses to start if what it
 * loaded does not hash to it, so a stale or partially copied corpus stops the
 * process rather than answering confidently from the wrong content.
 */
export const assistantCorpusChecksum =
  "${checksum}";
`;
}

const generated = render();
const check = process.argv.includes("--check");

if (check) {
  let existing = "";
  try {
    existing = readFileSync(outputPath, "utf8");
  } catch {
    console.error(`missing ${outputPath} — run: npm run assistant:build-corpus`);
    process.exit(1);
  }

  if (existing !== generated) {
    console.error(
      "The assistant corpus and its generated record disagree.\n" +
        "Run: npm run assistant:build-corpus\n" +
        "Then review the digest diff — it represents a change to OJ's public claims.",
    );
    process.exit(1);
  }

  console.log("assistant corpus record is up to date");
} else {
  writeFileSync(outputPath, generated, "utf8");
  console.log(`wrote ${outputPath}`);
  console.log(`corpus checksum: ${corpusChecksum(corpusDir)}`);
}
