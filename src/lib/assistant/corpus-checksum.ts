import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

/**
 * A deterministic fingerprint of the assistant corpus.
 *
 * This repository is where the corpus is authored and reviewed; the service that
 * serves it lives in another one. That copy is the weak seam in the arrangement:
 * a stale, truncated or half-copied corpus produces a service that answers
 * *confidently from the wrong content* — the one failure the whole design exists
 * to prevent, and the one a reader cannot detect from the outside.
 *
 * THIS ALGORITHM IS A CROSS-LANGUAGE CONTRACT.
 * It is implemented here and, identically, in the serving repository's Python
 * (`src/assistant/corpus_checksum.py`). Both sides assert the same fixture
 * digest, so a change to one that does not reach the other fails a test rather
 * than a deployment. Do not "tidy" any step without changing both and running
 * both suites.
 *
 * The steps, in order, because each one is load-bearing:
 *
 *   1. Select exactly the files the reader would read. Hashing a different set
 *      from the one that gets served would defeat the point entirely.
 *   2. Label each by its corpus-relative POSIX path, so a checksum computed on
 *      Windows matches one computed on Linux.
 *   3. Sort by that label. Directory iteration order is not a promise.
 *   4. Normalise line endings for `.md` and `.txt`; hash `.pdf` and `.docx`
 *      byte-for-byte. Text files pass through Git's `eol` handling and can
 *      legitimately differ by CRLF between checkouts; binary files cannot, and
 *      normalising them would corrupt the hash of a perfectly valid file.
 *   5. Digest each file, then digest the joined `"<digest>  <path>\n"` lines.
 *      Including the path means a rename counts as a change, which it is: the
 *      path is what appears in the citation.
 */

/**
 * Extensions the serving reader understands. A file with any other extension is
 * not corpus content, so hashing it would make the fingerprint disagree with
 * what is actually served.
 */
export const CORPUS_SUFFIXES = [".md", ".txt", ".docx", ".pdf"] as const;

/**
 * Extensions whose line endings are normalised before hashing.
 *
 * Deliberately not "everything text-ish": `.docx` is a zip archive and a `.pdf`
 * may contain CR bytes inside binary streams. Rewriting those would change a
 * file that is byte-identical to the one that was reviewed.
 */
const TEXT_SUFFIXES = new Set([".md", ".txt"]);

/**
 * Whether a file is corpus content rather than a note *about* the corpus.
 *
 * A `README.md` explaining what the folder is for is itself a supported format,
 * so without this it becomes searchable content and the assistant starts citing
 * the folder's own documentation as a source. Names beginning with `_` or `.`
 * are excluded on the same principle.
 *
 * Mirrors `is_corpus_document` in the serving repository. The two must agree.
 */
export function isCorpusDocument(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot <= 0) return false;

  const suffix = lower.slice(dot);
  if (!(CORPUS_SUFFIXES as readonly string[]).includes(suffix)) return false;
  if (lower.slice(0, dot) === "readme") return false;

  return !fileName.startsWith(".") && !fileName.startsWith("_");
}

function walk(directory: string, root: string, found: string[]): void {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      walk(full, root, found);
      continue;
    }
    if (isCorpusDocument(entry)) {
      // POSIX separators so a Windows-built artifact and a Linux-built one
      // produce the same label — and the same citation.
      found.push(relative(root, full).split(sep).join(posix.sep));
    }
  }
}

/** Corpus-relative POSIX paths of every corpus document, sorted. */
export function corpusFilePaths(directory: string): string[] {
  const found: string[] = [];
  walk(directory, directory, found);
  return found.sort();
}

function normalise(data: Buffer, path: string): Buffer {
  const dot = path.lastIndexOf(".");
  const suffix = dot > 0 ? path.slice(dot).toLowerCase() : "";
  if (!TEXT_SUFFIXES.has(suffix)) return data;

  // CRLF first, then any surviving lone CR. The other order turns every CRLF
  // into two newlines.
  const text = data.toString("binary").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return Buffer.from(text, "binary");
}

export interface CorpusFileDigest {
  /** Corpus-relative POSIX path — the label that appears in a citation. */
  readonly path: string;
  /** sha256 of the file's normalised bytes. */
  readonly digest: string;
}

/**
 * Per-file digests, path-sorted.
 *
 * Separate from {@link corpusChecksum} so a mismatch can be *localised*. Being
 * told two corpora differ is much less useful than being told which file
 * differs, and at the moment that matters — a rejected deployment — nobody wants
 * to bisect by hand.
 */
export function corpusFileDigests(directory: string): CorpusFileDigest[] {
  return corpusFilePaths(directory).map((path) => ({
    path,
    digest: createHash("sha256")
      .update(normalise(readFileSync(join(directory, ...path.split(posix.sep))), path))
      .digest("hex"),
  }));
}

/**
 * The single hex digest identifying this corpus.
 *
 * An empty corpus returns the sha256 of the empty string rather than throwing.
 * Whether an empty corpus is acceptable is a separate decision, made where the
 * corpus is used; conflating "no documents" with "cannot compute a checksum"
 * would put that judgement in the wrong place.
 */
export function corpusChecksum(directory: string): string {
  const joined = corpusFileDigests(directory)
    .map(({ path, digest }) => `${digest}  ${path}\n`)
    .join("");
  return createHash("sha256").update(joined, "utf8").digest("hex");
}
