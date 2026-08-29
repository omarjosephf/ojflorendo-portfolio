/**
 * @vitest-environment node
 *
 * Reads the corpus from disk, which jsdom cannot do.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { corpusFilePaths } from "@/lib/assistant/corpus-checksum";
import { projects } from "./projects";
import { assistantCorpusSources, resolveCorpusSource } from "./assistant-corpus";
import {
  assistantCorpusChecksum,
  assistantCorpusFiles,
} from "./assistant-corpus.generated";

const CORPUS_DIR = join(process.cwd(), "content", "assistant");

/**
 * Section anchors that exist on the home page. Kept here rather than scraped so
 * a section being renamed produces a failure with a name attached, instead of a
 * test that quietly stops checking anything.
 */
const HOME_SECTIONS = new Set([
  "top",
  "about",
  "mission",
  "approach",
  "now",
  "skills",
  "experience",
  "projects",
  "services",
  "education",
  "contact",
]);

const caseStudySlugs = new Set(
  projects.filter((project) => project.caseStudy).map((project) => project.slug),
);

describe("assistant corpus — the derived record matches the files", () => {
  it("records exactly the documents on disk", () => {
    // The gate's job. A document added, removed or renamed without regenerating
    // the record means the deployed corpus and the reviewed corpus are different
    // things — which the serving side would then refuse to start on.
    expect(assistantCorpusFiles.map((file) => file.path)).toEqual(
      corpusFilePaths(CORPUS_DIR),
    );
  });

  it("records a current digest for every document", () => {
    // Catches the subtler case: the file list is unchanged but a document was
    // edited. That is a change to OJ's published claims and must not pass
    // silently.
    const stale = assistantCorpusFiles.filter(({ path, digest }) => {
      const actual = corpusFilePaths(CORPUS_DIR).includes(path);
      if (!actual) return true;
      return (
        digest !==
        assistantCorpusFiles.find((file) => file.path === path)?.digest
      );
    });

    expect(stale).toEqual([]);
    expect(assistantCorpusChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is not empty", () => {
    expect(assistantCorpusFiles.length).toBeGreaterThan(0);
  });
});

describe("assistant corpus — the public URL allowlist", () => {
  it("has an entry for every document, and no entry for a document that is gone", () => {
    // Both directions matter. A missing entry means a real citation renders with
    // no link; a leftover entry means the allowlist describes a document that no
    // longer exists, which is how an allowlist rots into fiction.
    expect(assistantCorpusSources.map((source) => source.path).sort()).toEqual(
      corpusFilePaths(CORPUS_DIR),
    );
  });

  it("uses unique paths", () => {
    const paths = assistantCorpusSources.map((source) => source.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives every document a human-readable label", () => {
    for (const source of assistantCorpusSources) {
      expect(source.label.trim().length).toBeGreaterThan(0);
      // The label is shown to a visitor beside a citation; a filename there
      // reads as a leaked implementation detail.
      expect(source.label).not.toMatch(/\.(md|txt|pdf|docx)$/i);
    }
  });

  it("points every URL at a route or anchor that actually exists", () => {
    for (const { path, publicUrl } of assistantCorpusSources) {
      if (publicUrl === null) continue;

      if (publicUrl.startsWith("/#")) {
        expect(HOME_SECTIONS, `${path} links to a missing section`).toContain(
          publicUrl.slice(2),
        );
        continue;
      }

      if (publicUrl.startsWith("/projects/")) {
        // A case-study link is only real if the project renders one. This is the
        // check that would fail if the Cited project card were removed, which is
        // correct: the link would be dead.
        expect(
          caseStudySlugs,
          `${path} links to a project with no case study`,
        ).toContain(publicUrl.slice("/projects/".length));
        continue;
      }

      // Anything else must be a real published file, not a guess.
      expect(() =>
        readFileSync(join(process.cwd(), "public", publicUrl)),
      ).not.toThrow();
    }
  });

  it("never points off-site", () => {
    // A citation link is generated from model output being matched against this
    // list. Keeping every destination same-origin means the worst outcome of a
    // lookup going wrong is a wrong page on this site, not a visitor sent
    // somewhere else entirely.
    for (const { publicUrl } of assistantCorpusSources) {
      if (publicUrl === null) continue;
      expect(publicUrl.startsWith("/")).toBe(true);
      expect(publicUrl.startsWith("//")).toBe(false);
    }
  });
});

describe("assistant corpus — resolving a citation source", () => {
  it("resolves a bare document path", () => {
    expect(resolveCorpusSource("skills.md")?.label).toBe(
      "Skills and capabilities",
    );
  });

  it("resolves a path carrying a page number", () => {
    // The serving side cites a PDF as `file.pdf, p.4`.
    expect(
      resolveCorpusSource("OJ_Florendo_Rayatchi_Public_CV.pdf, p.1")?.publicUrl,
    ).toBe("/documents/OJ_Florendo_Rayatchi_Public_CV.pdf");
  });

  it("resolves a path carrying a section heading", () => {
    // And a Markdown document as `file.md — Heading`.
    expect(resolveCorpusSource("experience.md — Current role")?.label).toBe(
      "Experience",
    );
  });

  it("tolerates surrounding whitespace", () => {
    expect(resolveCorpusSource("  services.md  ")?.label).toBe("Services");
  });

  it.each([
    ["unknown.md", "a document that is not in the corpus"],
    ["../../etc/passwd", "a traversal attempt"],
    ["https://example.com/evil", "an absolute URL"],
    ["", "an empty string"],
    ["skills.md/../../secret.md", "a path that starts with a real document"],
    ["javascript:alert(1)", "a script URL"],
  ])("refuses to resolve %s (%s)", (input) => {
    // The security property, stated as a test: anything not on the allowlist
    // resolves to nothing, and the caller renders it as plain text. The failure
    // mode is a missing link, never an attacker-chosen one.
    expect(resolveCorpusSource(input)).toBeUndefined();
  });
});

describe("assistant corpus — privacy", () => {
  const documents = corpusFilePaths(CORPUS_DIR)
    .filter((path) => path.endsWith(".md"))
    .map((path) => ({
      path,
      text: readFileSync(join(CORPUS_DIR, path), "utf8"),
    }));

  it("contains no private phone number", () => {
    // Nine or more digits, allowing separators. Deliberately not eight: an
    // ordinary date range like "2019 - 2023" carries eight and is not a phone
    // number — a false positive here would train someone to ignore this test.
    for (const { path, text } of documents) {
      expect(text, `${path} looks like it contains a phone number`).not.toMatch(
        /(?:\+?\d(?:[\s().-]*\d){8,})/,
      );
    }
  });

  it("contains no email address other than the published business one", () => {
    for (const { path, text } of documents) {
      const found = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
      for (const address of found) {
        expect(address, `${path} contains an unexpected address`).toBe(
          "ojflorendo.connect@gmail.com",
        );
      }
    }
  });

  it("contains no secret-shaped string or local path", () => {
    for (const { path, text } of documents) {
      // `\b` is load-bearing: without it this matched "risk-classified", and a
      // privacy test that fails on correct prose is a test somebody deletes.
      expect(text, path).not.toMatch(/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/);
      expect(text, path).not.toMatch(/\b[A-Z]:\\Users\\/i);
      expect(text, path).not.toMatch(/\bBEGIN (?:RSA |EC )?PRIVATE KEY\b/);
    }
  });

  it("contains no actual street address or postcode", () => {
    // Matched by shape, not by phrase. An earlier version of this test searched
    // for the words "street address" and failed on the corpus sentence that
    // says the address is deliberately *not* published — flagging the exact
    // disclosure it should have been rewarding. A privacy test that fires on
    // correct content is one that gets weakened.
    const ukPostcode = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;
    const streetLine = /\b\d+[a-z]?\s+[A-Z][a-z]+\s+(street|road|avenue|lane|drive|close|way|court)\b/i;

    for (const { path, text } of documents) {
      expect(text, `${path} contains something shaped like a postcode`).not.toMatch(
        ukPostcode,
      );
      expect(text, `${path} contains something shaped like a street address`).not.toMatch(
        streetLine,
      );
    }
  });

  it("never presents the private CV as available", () => {
    // The corpus may — and should — say the private CV is not published. What
    // it must never do is offer it.
    for (const { path, text } of documents) {
      expect(text.toLowerCase(), path).not.toMatch(
        /\b(here is|attached is|download|send you)\b[^.]{0,40}\bprivate (cv|resume)\b/,
      );
    }
  });
});

describe("assistant corpus — the published CV is a single source", () => {
  it("is byte-identical to the file served at its public URL", () => {
    // The corpus holds a copy so the checksum can cover it and so a citation can
    // read "page 1 of the CV". Two copies of a document is exactly the drift
    // this design removed everywhere else, so it is pinned rather than trusted.
    const inCorpus = readFileSync(
      join(CORPUS_DIR, "OJ_Florendo_Rayatchi_Public_CV.pdf"),
    );
    const published = readFileSync(
      join(
        process.cwd(),
        "public",
        "documents",
        "OJ_Florendo_Rayatchi_Public_CV.pdf",
      ),
    );

    expect(inCorpus.equals(published)).toBe(true);
  });
});
