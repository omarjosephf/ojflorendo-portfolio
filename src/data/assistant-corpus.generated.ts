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
  { path: "about-oj.md", digest: "afe23ec7fca088899e2ae7035a7c094445f09c42fe62468856517db7c8358341" },
  { path: "contact-and-this-assistant.md", digest: "5af163b4eeaaaf41c398c147bf8e4b179ea68150602a006c91d80422e5475640" },
  { path: "education-and-credentials.md", digest: "5798f62edd572fc4089b9c6fdb814e92cdab3d637dcd325efd6495905768d97f" },
  { path: "experience.md", digest: "8cc229f3e3b2e80a43669da9db9047138ca6386ce80cd9125bde7d7c4f2ff27e" },
  { path: "how-oj-works.md", digest: "0ab01bf4a0a0e5402eec90d8af2f27bd583d1d2bb0464a6b40bd8277d88fd479" },
  { path: "project-cited.md", digest: "bba49db5ca74672b5429f93496da79e59347f2e2872569eb8bc7de65ff337339" },
  { path: "project-portfolio-platform.md", digest: "5fbcd1a2713a82d338120882d0c6a6fad59fcc510b71df44ff6747c3eb46bcf0" },
  { path: "services.md", digest: "61e43d428e3d97214cacfe160d1948904593d414aa365eff737116e6ec4db007" },
  { path: "skills.md", digest: "eb71e95ab21871f4ff718447c15d1b8cd6effbf94da5e2344410450409c6be79" },
];

/**
 * The digest identifying this exact corpus.
 *
 * The serving deployment is given this value and refuses to start if what it
 * loaded does not hash to it, so a stale or partially copied corpus stops the
 * process rather than answering confidently from the wrong content.
 */
export const assistantCorpusChecksum =
  "9eacd1593d6ab0d61469c1bf33dae903e0a5f2b74c835f7b0082a22c8167fd0b";
