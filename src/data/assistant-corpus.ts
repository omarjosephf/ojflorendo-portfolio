/**
 * Where each assistant corpus document sends a reader on this site.
 *
 * Hand-authored, and deliberately not derived from the corpus. It answers a
 * question the files cannot: "if this passage convinced you, where should you
 * go next?" A generated guess would be wrong for exactly the documents that
 * matter — a project document belongs on its case study, not on a section
 * anchor that happens to share a name.
 *
 * SECURITY: this map is the **allowlist** for every link the assistant renders.
 * A citation source is never used to build a URL; it is looked up here, and a
 * source with no entry renders as plain text with no link at all. That is what
 * keeps model output and visitor input out of an `href`. The failure mode is a
 * missing link, never an attacker-chosen one.
 *
 * The lists are kept honest by `assistant-corpus.test.ts`, which checks that the
 * files on disk and the entries here are the same set, and that every URL
 * resolves to a real route or section.
 */

export interface AssistantCorpusSource {
  /** Corpus-relative POSIX path — the label `cite()` produces in a citation. */
  readonly path: string;
  /** Short human-readable name shown beside the citation. */
  readonly label: string;
  /**
   * Where a reader should go to see this content in its published form, or
   * `null` when the document has no single public home. `null` is a real
   * answer, not a gap to fill: a link that lands somewhere only loosely related
   * is worse than no link.
   */
  readonly publicUrl: string | null;
}

export const assistantCorpusSources: readonly AssistantCorpusSource[] = [
  {
    path: "OJ_Florendo_Rayatchi_Public_CV.pdf",
    label: "Public CV",
    // The reviewed, phone-free public CV, already published at this path. It is
    // in the corpus because a citation reading "page 1 of the CV" is the most
    // checkable evidence the assistant can offer.
    publicUrl: "/documents/OJ_Florendo_Rayatchi_Public_CV.pdf",
  },
  {
    path: "about-oj.md",
    label: "About OJ",
    publicUrl: "/#about",
  },
  {
    path: "contact-and-this-assistant.md",
    label: "Contact and about this assistant",
    publicUrl: "/#contact",
  },
  {
    path: "education-and-credentials.md",
    label: "Education and credentials",
    publicUrl: "/#education",
  },
  {
    path: "experience.md",
    label: "Experience",
    publicUrl: "/#experience",
  },
  {
    path: "how-oj-works.md",
    label: "How OJ works",
    publicUrl: "/#approach",
  },
  {
    path: "project-cited.md",
    label: "Cited — Document Assistant",
    publicUrl: "/projects/cited",
  },
  {
    path: "project-portfolio-platform.md",
    label: "Personal Portfolio & Professional Platform",
    publicUrl: "/projects/personal-portfolio-website",
  },
  {
    path: "services.md",
    label: "Services",
    publicUrl: "/#services",
  },
  {
    path: "skills.md",
    label: "Skills and capabilities",
    publicUrl: "/#skills",
  },
];

const byPath = new Map(
  assistantCorpusSources.map((source) => [source.path, source]),
);

/**
 * Resolve a citation source string to an allowlisted corpus document.
 *
 * The serving side decorates the document path with provenance — `cv.pdf, p.4`
 * for a page, `notes.md — Setup` for a heading — so the raw string is not a key.
 * The document path is the part before the first such separator.
 *
 * Returns `undefined` for anything not in the allowlist, including anything
 * malformed or unexpected. Callers must render that as text, never as a link.
 */
export function resolveCorpusSource(
  citationSource: string,
): AssistantCorpusSource | undefined {
  const trimmed = citationSource.trim();

  // Order matters only in that both separators must be considered; whichever
  // appears first ends the path. A filename containing " — " would break this,
  // which is why filenames are constrained by the test rather than by hope.
  const cut = Math.min(
    ...[trimmed.indexOf(", p."), trimmed.indexOf(" — ")]
      .filter((index) => index !== -1)
      .concat(trimmed.length),
  );

  return byPath.get(trimmed.slice(0, cut).trim());
}
