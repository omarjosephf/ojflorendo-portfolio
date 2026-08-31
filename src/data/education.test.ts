import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { certifications } from "./education";

/**
 * The owner published every certificate document on 31 August 2026 so that no
 * credential is left unevidenced. Before that change three of the six had
 * neither a document nor an issuer verification page, which is the exact
 * appearance the Credentials section exists to avoid. These tests keep that
 * property from regressing silently through a later data edit.
 */
describe("published credential evidence", () => {
  it("gives every credential a certificate document", () => {
    for (const credential of certifications) {
      expect(
        credential.certificatePath,
        `${credential.title} has no certificatePath`,
      ).toBeTruthy();
    }
  });

  it("points every certificate path at a file that is actually published", () => {
    for (const credential of certifications) {
      const path = credential.certificatePath as string;
      expect(path.startsWith("/documents/certificates/")).toBe(true);
      expect(path.endsWith(".pdf")).toBe(true);
      // No spaces, parentheses or apostrophes: the source filenames had all
      // three and they do not belong in a public URL.
      expect(path).toMatch(/^\/documents\/certificates\/[a-z0-9-]+\.pdf$/);
      expect(
        existsSync(join(process.cwd(), "public", path)),
        `${path} is referenced but not present in public/`,
      ).toBe(true);
    }
  });

  it("keeps certificate documents unique per credential", () => {
    const paths = certifications.map((credential) => credential.certificatePath);
    expect(new Set(paths).size).toBe(certifications.length);
  });

  it("still links issuer verification where a real page exists", () => {
    const verified = certifications.filter(
      (credential) => credential.verificationUrl,
    );
    expect(verified).toHaveLength(3);
    for (const credential of verified) {
      expect(credential.verificationUrl).toMatch(/^https:\/\//);
    }
  });
});
