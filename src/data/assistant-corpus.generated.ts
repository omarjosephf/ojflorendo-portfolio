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
  { path: "about-oj.md", digest: "a36e9600cbedc63b9e4157d0166f81c3cd53086eece6695655eedc1a26209aff" },
  { path: "contact-and-this-assistant.md", digest: "7a7fa45b357f386651dd4cfae2cad7ee9822dc679cf917ff4f29e164dc423edd" },
  { path: "education-and-credentials.md", digest: "5798f62edd572fc4089b9c6fdb814e92cdab3d637dcd325efd6495905768d97f" },
  { path: "experience.md", digest: "8cc229f3e3b2e80a43669da9db9047138ca6386ce80cd9125bde7d7c4f2ff27e" },
  { path: "how-oj-works.md", digest: "884486a3bf7fd12bee50ee97281b22530533ab77417b7ac30f72c5c934eec715" },
  { path: "project-cited.md", digest: "1255b3b34dc392d8403a8f4ea46055607d4abdc1dcd5a8d0cac3ef619084b744" },
  { path: "project-portfolio-platform.md", digest: "4343649ff25bdefd8717f3b1a868ceb4d15d386c6088c3cd36e560f33f3aa371" },
  { path: "services.md", digest: "5a0089192b4b1c6743d62de5d0af5cebf4c0809e0692a6e6712bb12bb525016a" },
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
  "86e8ddb479d8ca018942fa6736c2872fc6227659552c987a3d936d6a1c2bc42b";
