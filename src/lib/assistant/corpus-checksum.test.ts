/**
 * @vitest-environment node
 *
 * Filesystem and `node:crypto`, neither of which jsdom models honestly.
 */
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  corpusChecksum,
  corpusFileDigests,
  corpusFilePaths,
  isCorpusDocument,
} from "./corpus-checksum";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "corpus-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(relativePath: string, contents: string | Buffer): void {
  const full = join(root, relativePath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, contents);
}

function seed(): void {
  write("about.md", "# About\n\nOJ builds practical products.\n");
  write("projects/cited.md", "# Cited\n\nA document assistant.\n");
}

describe("corpus checksum — stability", () => {
  it("hashes the same corpus the same way twice", () => {
    seed();

    expect(corpusChecksum(root)).toBe(corpusChecksum(root));
  });

  it("treats a CRLF checkout as identical to an LF one", () => {
    // Without this the checksum would reject a corpus that Git considers
    // byte-identical, and the natural "fix" would be to stop verifying — losing
    // the whole control to a platform detail.
    write("unix/a.md", Buffer.from("line one\nline two\n"));
    write("windows/a.md", Buffer.from("line one\r\nline two\r\n"));

    expect(corpusChecksum(join(root, "unix"))).toBe(
      corpusChecksum(join(root, "windows")),
    );
  });

  it("hashes a PDF byte-for-byte rather than normalising it", () => {
    // A PDF can legitimately contain CR bytes inside a stream. Rewriting them
    // would change the hash of a file nobody edited.
    write("crlf/cv.pdf", Buffer.from("%PDF-1.4\r\nbody\r\n"));
    write("lf/cv.pdf", Buffer.from("%PDF-1.4\nbody\n"));

    expect(corpusChecksum(join(root, "crlf"))).not.toBe(
      corpusChecksum(join(root, "lf")),
    );
  });
});

describe("corpus checksum — sensitivity", () => {
  it("changes when a document is edited", () => {
    seed();
    const before = corpusChecksum(root);

    write("about.md", "# About\n\nOJ builds other things.\n");

    expect(corpusChecksum(root)).not.toBe(before);
  });

  it("changes when a document is added", () => {
    seed();
    const before = corpusChecksum(root);

    write("services.md", "# Services\n");

    expect(corpusChecksum(root)).not.toBe(before);
  });

  it("changes when a document is removed", () => {
    seed();
    const before = corpusChecksum(root);

    rmSync(join(root, "about.md"));

    expect(corpusChecksum(root)).not.toBe(before);
  });

  it("changes when a document is renamed", () => {
    // The path is part of the hash because the path is the citation. A renamed
    // file cites differently, so it is a different corpus.
    seed();
    const before = corpusChecksum(root);

    renameSync(join(root, "about.md"), join(root, "about-oj.md"));

    expect(corpusChecksum(root)).not.toBe(before);
  });
});

describe("corpus checksum — file selection", () => {
  it("hashes exactly the files the reader would read", () => {
    // The subtle failure this prevents: hashing a different set from the served
    // set means the checksum passes while the served content has changed —
    // worse than no checksum, because it carries a guarantee it does not give.
    seed();
    const before = corpusChecksum(root);

    write("README.md", "Notes about this folder, not content.\n");
    write("_draft.md", "Not ready.\n");
    write("notes.rst", "Unsupported format.\n");

    expect(corpusChecksum(root)).toBe(before);
  });

  it.each([
    ["about.md", true],
    ["cv.pdf", true],
    ["notes.txt", true],
    ["report.docx", true],
    ["README.md", false],
    ["readme.txt", false],
    ["_draft.md", false],
    [".hidden.md", false],
    ["notes.rst", false],
    ["image.png", false],
    ["noextension", false],
  ])("classifies %s as corpus content: %s", (name, expected) => {
    expect(isCorpusDocument(name as string)).toBe(expected);
  });

  it("reports paths sorted and POSIX-separated", () => {
    seed();
    write("zzz.md", "Last.\n");

    expect(corpusFilePaths(root)).toEqual([
      "about.md",
      "projects/cited.md",
      "zzz.md",
    ]);
  });

  it("reports a digest per file so a mismatch can be localised", () => {
    seed();

    const digests = corpusFileDigests(root);

    expect(digests).toHaveLength(2);
    expect(digests[0]!.path).toBe("about.md");
    expect(digests[0]!.digest).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("corpus checksum — cross-language contract", () => {
  /**
   * The algorithm is duplicated in the serving repository's Python. This is
   * where that duplication is held honest.
   *
   * The same fixture and the same expected digest exist in
   * `tests/test_corpus_checksum.py` there. If this fails after a change here,
   * the two implementations have diverged and a corpus built by one will be
   * rejected by the other — which is a deployment that will not start. Change
   * both deliberately, or change neither.
   */
  const AGREED_DIGEST =
    "2f5ed64d2a10043ec14c73eb2be41af3dbd949f3a4e282ac4adf27d4914dbbe3";

  it("produces the digest the Python implementation produces", () => {
    write("one.md", Buffer.from("# One\n\nAlpha.\n"));
    write("nested/two.txt", Buffer.from("Beta.\n"));

    expect(corpusChecksum(root)).toBe(AGREED_DIGEST);
  });
});
