// GENERATED FILE — do not edit by hand.
//
// Written by `npm run assistant:build-corpus` from the documents in
// `content/assistant/`. Those documents are the source of truth; this file
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
  { path: "OJ_Florendo_Rayatchi_Public_CV.pdf", digest: "1fccbd560745b886290350795c4e4bd4c6df68683f0ede3c043e7894a9f6c85b" },
  { path: "about-oj.md", digest: "805b612dc73cabcce6cf16f451a6a7f6c95fef369edd4527a98c18dd774ba8c5" },
  { path: "contact-and-this-assistant.md", digest: "c19447964d04ac410be244b3c2888cff586da4489a3b20f5ed9988a08ab5f67a" },
  { path: "education-and-credentials.md", digest: "5798f62edd572fc4089b9c6fdb814e92cdab3d637dcd325efd6495905768d97f" },
  { path: "experience.md", digest: "cc180653a94799c7aa1d795a3b2914100fc8950c8addf93e193c17d4610a7764" },
  { path: "how-oj-works.md", digest: "0ab01bf4a0a0e5402eec90d8af2f27bd583d1d2bb0464a6b40bd8277d88fd479" },
  { path: "project-cited.md", digest: "2856411d19c006ea9072c71e2b9c5cd7770114f1166424d19ed9355dc4a3ed07" },
  { path: "project-portfolio-platform.md", digest: "5fbcd1a2713a82d338120882d0c6a6fad59fcc510b71df44ff6747c3eb46bcf0" },
  { path: "services.md", digest: "ef3f0be83466397416ac0b60a2086be7c68a0c5b2b10b63431006b21d98b20ea" },
  { path: "skills.md", digest: "2682afe408f1393c4a29175052a8a2af79c927184aff26e348aa9a6835b04ae3" },
];

/**
 * The digest identifying this exact corpus.
 *
 * The serving deployment is given this value and refuses to start if what it
 * loaded does not hash to it, so a stale or partially copied corpus stops the
 * process rather than answering confidently from the wrong content.
 */
export const assistantCorpusChecksum =
  "c9b26214891bcf9a10590d91a386f0a8fbe6ebd46371e0d833998281ace579e2";
